'use strict';

async function loadAdminFlags() {
  const result = await backend().from('cs_report_flags')
    .select('id,report_id,reporter_id,reason,details,created_at')
    .order('created_at', { ascending: false });
  return unwrap(result, 'Could not load report flags for review');
}

async function adminReviewReport(report, action) {
  if (action === 'verify_approve') {
    if (!window.confirm('Approve this completion evidence and mark the report Resolved?')) return;
    try {
      await transitionReport(report.id, action);
      await refreshBackendState();
      route();
      toast('Completion evidence approved. The report is resolved.');
    } catch (error) {
      console.error('Could not approve completion evidence:', error);
      toast(error.message || 'Could not approve the evidence.');
    }
    return;
  }

  openDlg(`<form class="dlg" id="rejectEvidence" novalidate>
    <button type="button" class="x" data-close aria-label="Close">${ic('x',22)}</button>
    <h2 id="dlgTitle">Request more work</h2>
    <p class="muted">${esc(report.title)}</p>
    <div class="field"><label for="rejectNote">Explain what needs attention</label><textarea class="in" id="rejectNote" maxlength="400" required></textarea></div>
    <div class="actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">Send review decision</button></div>
  </form>`, dialog => {
    $('#rejectEvidence', dialog).onsubmit = async event => {
      event.preventDefault();
      const note = $('#rejectNote', dialog).value.trim();
      if (note.length < 5) return void setErr($('#rejectNote', dialog), 'Add at least 5 characters explaining what needs attention.');
      const submit = $('button[type=submit]', dialog);
      submit.disabled = true;
      submit.textContent = 'Saving…';
      try {
        await transitionReport(report.id, action, { note });
        await refreshBackendState();
        dialog.close();
        route();
        toast('More work requested. The assigned volunteer has been notified.');
      } catch (error) {
        console.error('Could not reject completion evidence:', error);
        toast(error.message || 'Could not save the review decision.');
        submit.disabled = false;
        submit.textContent = 'Send review decision';
      }
    };
  });
}

async function renderAdminFlags() {
  const target = $('#adminFlags');
  if (!target) return;
  const adminId = state.profileUserId;
  try {
    const flags = await loadAdminFlags();
    if (!document.body.contains(target) || state.profileUserId !== adminId || !isAdmin()) return;
    const rows = flags.map(flag => {
      const report = iss(flag.report_id);
      return `<li class="admin-row"><div><b>${esc(report?.title || 'Report no longer available')}</b><p>${esc(flag.reason)}${flag.details ? ` · ${esc(flag.details)}` : ''}</p><small>${timeEl(Date.parse(flag.created_at))}</small></div>${report ? `<a class="btn btn-ghost btn-sm" href="#/issue/${report.id}">Open report</a>` : ''}</li>`;
    }).join('');
    target.innerHTML = rows
      ? `<ul class="admin-list">${rows}</ul>`
      : '<p class="muted">There are no submitted flags.</p>';
  } catch (error) {
    if (!document.body.contains(target) || state.profileUserId !== adminId || !isAdmin()) return;
    console.error('Could not load report flags for review:', error);
    target.innerHTML = `<p class="err" role="alert">Could not load flags: ${esc(error.message)}</p><button type="button" class="btn btn-ghost btn-sm" id="retryAdminFlags">Try again</button>`;
    $('#retryAdminFlags').onclick = renderAdminFlags;
  }
}

VIEWS.admin = function () {
  if (!state.signedIn) return needAuth('#/admin');
  if (state.profileStatus !== 'ready') {
    page(`<div class="wrap"><section class="block" role="status"><h1>Administrator access unavailable</h1><p>Your signed-in profile must load before the administrator dashboard can be checked.</p><a class="btn btn-primary" href="#/me">Open your profile</a></section></div>`);
    return;
  }
  if (!isAdmin()) {
    page(`<div class="wrap"><section class="block" role="alert"><h1>Administrator access required</h1><p>This dashboard is only available to accounts granted the administrator role by the project owner.</p><a class="btn btn-primary" href="#/me">Return to your profile</a></section></div>`);
    return;
  }

  const pending = state.issues.filter(report => report.status === 'Pending Verification');
  const members = [...state.communityProfiles].sort((a, b) =>
    (a.display_name || '').localeCompare(b.display_name || ''));
  page(`<div class="wrap admin-page">
    <div class="page-head"><p class="eyebrow">Restricted tools</p><h1>Administrator dashboard</h1><p class="lead">Review completion evidence and manage volunteer access. Database functions enforce administrator permissions independently of this screen.</p></div>
    <section class="block" aria-labelledby="verificationQueue"><h2 id="verificationQueue">Completion evidence awaiting review (${pending.length})</h2>
      ${pending.length ? `<div class="admin-review-list">${pending.map(report => {
        const evidence = [...report.timeline].reverse().find(event => event.status === 'Pending Verification' && event.photo);
          const canReview = Boolean(evidence) && report.reporter !== 'me' && report.volunteer !== 'me';
          return `<article class="admin-review">
            ${evidence ? `<img src="${esc(evidence.photo)}" alt="Completion evidence for ${esc(report.title)}" loading="lazy">` : `<div class="admin-photo-missing">${ic('camera',28)}<span>Evidence image unavailable</span></div>`}
            <div class="admin-review-body"><div class="chips">${chip(report.status)}${catChip(report.cat)}</div><h3><a href="#/issue/${report.id}">${esc(report.title)}</a></h3><p>${esc(evidence?.text || 'No completion note provided.')}</p><p class="muted">Submitted ${evidence ? timeEl(evidence.ts) : 'with the report'} by ${evidence ? esc(whoTag(evidence.who)) : esc(who(report.volunteer))}</p>${canReview?`<div class="row"><button class="btn btn-primary btn-sm" data-review="verify_approve" data-report="${esc(report.id)}">${ic('check',16)} Approve</button><button class="btn btn-ghost btn-sm" data-review="verify_reject" data-report="${esc(report.id)}">Request more work</button><a class="btn btn-quiet btn-sm" href="#/issue/${report.id}">View timeline</a></div>`:`<p class="muted">${evidence?'A different administrator must review a report you submitted or worked on.':'Evidence is unavailable; this report cannot be reviewed until its photo is accessible.'}</p>`}</div>
        </article>`;
      }).join('')}</div>` : '<p class="muted">No completion photos are waiting for review.</p>'}
    </section>
    <section class="block" aria-labelledby="flagQueue"><h2 id="flagQueue">Community flags</h2><div id="adminFlags" role="status">Loading submitted flags…</div></section>
    <section class="block" aria-labelledby="volunteerAccess"><h2 id="volunteerAccess">Volunteer access</h2><p class="muted">Grant access only after your organization’s review. Active task assignments cannot be revoked until resolved or reassigned.</p>
      <ul class="admin-list">${members.map(member => {
        const volunteer = (member.roles || []).includes('volunteer');
        const roleText = (member.roles || []).map(role => role === 'admin' ? 'Administrator' : role === 'volunteer' ? 'Volunteer' : 'Resident').join(', ') || 'No roles';
        return `<li class="admin-row"><div><b>${esc(member.display_name || 'A neighbor')}</b><p>${esc(roleText)}</p></div><button type="button" class="btn ${volunteer ? 'btn-ghost' : 'btn-primary'} btn-sm" data-volunteer="${esc(member.id)}" data-enabled="${volunteer ? 'false' : 'true'}">${volunteer ? 'Remove volunteer access' : 'Grant volunteer access'}</button></li>`;
      }).join('')}</ul>
    </section>
  </div>`);

  $$('[data-review]').forEach(button => button.onclick = async () => {
    const report = iss(button.dataset.report);
    if (!report) return toast('This report is no longer available.');
    button.disabled = true;
    await adminReviewReport(report, button.dataset.review);
    if (document.body.contains(button)) button.disabled = false;
  });
  $$('[data-volunteer]').forEach(button => button.onclick = async () => {
    button.disabled = true;
    try {
      await setVolunteerRole(button.dataset.volunteer, button.dataset.enabled === 'true');
      await refreshBackendState();
      VIEWS.admin();
      renderChrome('admin');
      toast(button.dataset.enabled === 'true' ? 'Volunteer access granted.' : 'Volunteer access removed.');
    } catch (error) {
      console.error('Could not change volunteer access:', error);
      toast(error.message || 'Could not change volunteer access.');
      button.disabled = false;
    }
  });
  renderAdminFlags();
};
