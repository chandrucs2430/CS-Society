'use strict';

const PHOTO_BUCKET = 'cs-report-photos';
let csClient = null;
let sessionUser = null;
let recoveryRequested = false;
let backendLoadVersion = 0;
let backendInitialized = false;
let backendLoadPromise = null;
let backendLoadPromiseVersion = 0;

const defaultPrefs = () => ({ claimed: true, update: true, resolved: true, milestone: true, near: false });

function requireCurrentUser(userId) {
  if (!sessionUser || sessionUser.id !== userId) {
    throw new Error('Your signed-in account changed. Please retry the action.');
  }
}

function emptyProfile(email = '') {
  return { name: '', email, hood: '', roles: [], photo: null, avatarPath: null, prefs: defaultPrefs() };
}

function clearAccountState(status, email = '', clearCommunity = false) {
  state.profile = emptyProfile(email);
  state.profileStatus = status;
  state.profileError = '';
  state.profileUserId = null;
  state.notifs = [];
  state.flags = [];
  state.hours = 0;
  state.mode = 'resident';
  if (clearCommunity) {
    state.issues = [];
    state.people = {};
    state.communityProfiles = [];
  }
}

function displayAuthState() {
  if (typeof route === 'function') route();
}

function showBackendLoadError(error) {
  if (!state.signedIn) return;
  state.profileStatus = navigator.onLine ? 'error' : 'offline';
  state.profileError = error.message || 'Could not load your profile from Supabase.';
  state.profile = emptyProfile(sessionUser?.email || '');
  state.notifs = [];
  state.flags = [];
  state.hours = 0;
  state.issues = [];
  state.people = {};
  displayAuthState();
}

function backend() {
  if (!csClient) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.');
  return csClient;
}

function unwrap(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result.data;
}

async function signedPhotoUrls(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!sessionUser || uniquePaths.length === 0) return new Map();

  const urls = new Map();
  for (let offset = 0; offset < uniquePaths.length; offset += 100) {
    const batch = uniquePaths.slice(offset, offset + 100);
    const { data, error } = await backend().storage.from(PHOTO_BUCKET).createSignedUrls(batch, 3600);
    if (error) throw new Error(`Could not create private photo links: ${error.message}`);
    for (const item of data || []) {
      if (item.error || !item.signedUrl) {
        throw new Error(`Could not create a private photo link: ${item.error?.message || 'missing signed URL'}`);
      }
      urls.set(item.path, item.signedUrl);
    }
    if (batch.some(path => !urls.has(path))) {
      throw new Error('Could not create a private photo link: Supabase returned an incomplete response.');
    }
  }
  return urls;
}

function mapEvent(row) {
  return {
    id: row.id,
    ts: Date.parse(row.created_at),
    who: row.actor_id === sessionUser?.id ? 'me' : row.actor_id,
    type: row.event_type,
    status: row.status,
    text: row.note || '',
    photoPath: row.photo_path,
    photo: null,
    hrs: Number(row.volunteer_hours) || 0
  };
}

function mapReport(row) {
  const point = toXY({ lat: row.latitude, lng: row.longitude });
  return {
    id: row.id,
    title: row.title,
    cat: row.category,
    status: row.status,
    x: point.x,
    y: point.y,
    place: row.place || '',
    desc: row.description || row.title,
    reporter: row.reporter_id === sessionUser?.id ? 'me' : row.reporter_id,
    volunteer: row.volunteer_id === sessionUser?.id ? 'me' : row.volunteer_id,
    reportedAt: Date.parse(row.created_at),
    timeline: (row.cs_report_events || []).map(mapEvent).sort((a, b) => a.ts - b.ts)
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    type: row.kind,
    ts: Date.parse(row.created_at),
    read: row.is_read,
    issue: row.report_id,
    text: row.message
  };
}

async function loadBackendState() {
  const loadVersion = ++backendLoadVersion;
  const client = backend();
  let hadSession = false;
  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(`Could not restore your Supabase session: ${sessionError.message}`);
    hadSession = Boolean(session);
    if (state.profileUserId !== (session?.user?.id || null)) {
      clearAccountState(session ? 'loading' : 'signedOut', session?.user?.email || '', true);
    }
    state.signedIn = hadSession;

    let verifiedUser = null;
    if (session) {
      const { data, error } = await client.auth.getUser();
      if (error) throw new Error(`Could not verify your Supabase session: ${error.message}`);
      verifiedUser = data.user;
      if (!verifiedUser) throw new Error('Supabase did not return a verified signed-in user.');
    }

    if (loadVersion !== backendLoadVersion) return;
    const previousUserId = state.profileUserId;
    if (previousUserId !== (verifiedUser?.id || null)) {
      clearAccountState(verifiedUser ? 'loading' : 'signedOut', verifiedUser?.email || '', true);
    }
    sessionUser = verifiedUser;
    state.signedIn = Boolean(verifiedUser);
    state.profileUserId = verifiedUser?.id || null;
    state.profileStatus = verifiedUser ? 'loading' : 'signedOut';
    state.profileError = '';

    const requests = [
      client.from('cs_profiles').select('id,display_name,roles,avatar_path'),
      client.from('cs_reports').select('*,cs_report_events(*)').order('created_at', { ascending: false })
    ];
    if (verifiedUser) {
      requests.push(client.from('profiles')
        .select('id,display_name,neighborhood,avatar_path,updated_at')
        .eq('id', verifiedUser.id).maybeSingle());
      requests.push(client.from('cs_profile_settings')
        .select('notification_prefs').eq('user_id', verifiedUser.id).maybeSingle());
      requests.push(client.from('cs_notifications').select('*')
        .eq('user_id', verifiedUser.id).order('created_at', { ascending: false }));
      requests.push(client.from('cs_report_flags').select('report_id').eq('reporter_id', verifiedUser.id));
    }

    const results = await Promise.all(requests);
    if (loadVersion !== backendLoadVersion) return;

    const publicProfiles = unwrap(results[0], 'Could not load community profiles');
    const reports = unwrap(results[1], 'Could not load community reports');
    const profile = verifiedUser ? unwrap(results[2], 'Could not load your profile') : null;
    const mappedReports = reports.map(mapReport);
    const photoPaths = mappedReports.flatMap(report => report.timeline.map(event => event.photoPath));
    if (profile?.avatar_path) photoPaths.push(profile.avatar_path);
    const photoUrls = await signedPhotoUrls(photoPaths);
    if (loadVersion !== backendLoadVersion) return;
    for (const report of mappedReports) {
      for (const event of report.timeline) event.photo = photoUrls.get(event.photoPath) || null;
    }
    state.people = Object.fromEntries(publicProfiles.map(profile => [profile.id, profile.display_name || 'A neighbor']));
    state.communityProfiles = publicProfiles;
    state.issues = mappedReports;
    state.flags = [];
    state.notifs = [];
    state.hours = 0;

    if (verifiedUser) {
      if (!profile) {
        state.profile = emptyProfile(verifiedUser.email || '');
        state.profileUserId = verifiedUser.id;
        state.profileStatus = 'missing';
      } else {
        const settings = unwrap(results[3], 'Could not load your profile settings');
        const publicProfile = publicProfiles.find(item => item.id === verifiedUser.id);
        state.profile = {
          name: profile.display_name,
          email: verifiedUser.email || '',
          hood: profile.neighborhood,
          roles: publicProfile?.roles || [],
          photo: photoUrls.get(profile.avatar_path) || null,
          avatarPath: profile.avatar_path,
          prefs: { ...defaultPrefs(), ...(settings?.notification_prefs || {}) }
        };
        state.profileStatus = 'ready';
      }
      state.notifs = unwrap(results[4], 'Could not load your notifications').map(mapNotification);
      state.flags = unwrap(results[5], 'Could not load your report flags').map(flag => flag.report_id);
      state.hours = state.issues.reduce((total, report) => total + report.timeline
        .filter(event => event.who === 'me').reduce((sum, event) => sum + event.hrs, 0), 0);
      const savedMode = loadUiPreferences().mode;
      state.mode = ['resident', 'volunteer'].includes(savedMode) && state.profile.roles.includes(savedMode)
        ? savedMode
        : state.profile.roles.includes('resident') ? 'resident'
          : state.profile.roles.includes('volunteer') ? 'volunteer' : 'resident';
    } else {
      clearAccountState('signedOut');
    }
  } catch (error) {
    if (loadVersion !== backendLoadVersion) return;
    if (hadSession) state.signedIn = true;
    showBackendLoadError(error);
    throw error;
  }
}

function loadUiPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem('cs-society-ui-v1') || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch (error) {
    console.warn('Could not read local display preferences:', error);
    return {};
  }
}

async function initializeBackend() {
  const config = window.__CS_CONFIG__;
  if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
    throw new Error('Supabase configuration is missing. Rebuild with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  if (!window.supabase?.createClient) {
    throw new Error('The Supabase client library did not load. Check the network connection and reload.');
  }
  csClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: true, detectSessionInUrl: true, persistSession: true }
  });
  csClient.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') recoveryRequested = true;
    if (!['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(event)) return;
    if (!backendInitialized) return;

    const incomingUserId = session?.user?.id || null;
    const currentUserId = sessionUser?.id || state.profileUserId;
    if (incomingUserId !== currentUserId || event === 'SIGNED_OUT') {
      backendLoadVersion++;
      sessionUser = null;
      clearAccountState(incomingUserId ? 'loading' : 'signedOut', session?.user?.email || '', true);
      state.signedIn = Boolean(incomingUserId);
      displayAuthState();
    }

    setTimeout(() => {
      refreshBackendState()
        .then(displayAuthState)
        .catch(error => console.error('Could not refresh the signed-in account:', error));
    }, 0);
  });
  state.loc = loadUiPreferences().loc || state.loc;
  await refreshBackendState();
  backendInitialized = true;

  const authHash = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (recoveryRequested || authHash.get('type') === 'recovery') {
    go('#/auth?mode=update');
    return;
  }
  const pathname = location.pathname.replace(/\/+$/, '');
  if (!location.hash && pathname && pathname !== '/index.html') go('#/not-found');
  if (sessionUser && state.profileStatus === 'ready' && !state.profile.name && !location.hash.includes('mode=setup')) {
    go('#/auth?mode=setup');
    return;
  }
  route();
}

function save() {
  try {
    localStorage.setItem('cs-society-ui-v1', JSON.stringify({ loc: state.loc, mode: state.mode }));
  } catch (error) {
    console.warn('Could not save local display preferences:', error);
  }
}

async function refreshBackendState() {
  if (backendLoadPromise && backendLoadPromiseVersion === backendLoadVersion) {
    return backendLoadPromise;
  }
  const pending = loadBackendState();
  backendLoadPromise = pending;
  backendLoadPromiseVersion = backendLoadVersion;
  try {
    await pending;
  } finally {
    if (backendLoadPromise === pending) backendLoadPromise = null;
  }
}

function handleBackendInitializationError(error) {
  if (csClient && state.signedIn) {
    showBackendLoadError(error);
    return;
  }
  renderUnexpectedError(error);
}

async function uploadPhoto(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  const user = sessionUser;
  if (!user) throw new Error('Sign in before uploading a photo.');
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || blob.size > 5 * 1024 * 1024) {
    throw new Error('Photos must be JPEG, PNG or WebP images smaller than 5 MB.');
  }
  requireCurrentUser(user.id);
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await backend().storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false
  });
  if (error) throw new Error(`Could not upload photo: ${error.message}`);
  return path;
}

async function discardPhoto(path) {
  if (!path) return;
  try {
    const { error } = await backend().storage.from(PHOTO_BUCKET).remove([path]);
    if (error) console.error('Could not remove an unused uploaded photo:', error.message);
  } catch (error) {
    console.error('Could not remove an unused uploaded photo:', error);
  }
}

async function createReport(report) {
  const userId = sessionUser?.id;
  if (!userId) throw new Error('Sign in before creating a report.');
  const photoPath = await uploadPhoto(report.photo);
  try {
    requireCurrentUser(userId);
    const { data, error } = await backend().rpc('cs_create_report', {
      p_title: report.title,
      p_description: report.description,
      p_category: report.category,
      p_latitude: report.latitude,
      p_longitude: report.longitude,
      p_place: report.place,
      p_photo_path: photoPath
    });
    if (error) throw new Error(`Could not send report: ${error.message}`);
    return data;
  } catch (error) {
    await discardPhoto(photoPath);
    throw error;
  }
}

async function transitionReport(reportId, action, details = {}) {
  const userId = sessionUser?.id;
  if (!userId) throw new Error('Sign in before updating a report.');
  const photoPath = await uploadPhoto(details.photo);
  try {
    requireCurrentUser(userId);
    const { error } = await backend().rpc('cs_transition_report', {
      p_report_id: reportId,
      p_action: action,
      p_note: details.note || '',
      p_status: details.status || null,
      p_photo_path: photoPath,
      p_hours: details.hours || 0
    });
    if (error) throw new Error(`Could not ${action} report: ${error.message}`);
  } catch (error) {
    await discardPhoto(photoPath);
    throw error;
  }
}

async function updateProfile(profile, avatarDataUrl) {
  const user = sessionUser;
  if (!user) throw new Error('Sign in before updating your profile.');
  const displayName = String(profile.name || '').replace(/\s+/g, ' ').trim();
  const neighborhood = String(profile.neighborhood || '').replace(/\s+/g, ' ').trim();
  if (displayName.length < 2 || displayName.length > 100) {
    throw new Error('Your name must be between 2 and 100 characters.');
  }
  if (neighborhood.length > 160) throw new Error('Your neighborhood must be 160 characters or fewer.');

  const previousAvatarPath = state.profile.avatarPath;
  const avatarPath = avatarDataUrl ? await uploadPhoto(avatarDataUrl) : previousAvatarPath;
  let savedProfile;
  try {
    requireCurrentUser(user.id);
    const { data, error } = await backend().rpc('cs_save_my_profile', {
      p_display_name: displayName,
      p_neighborhood: neighborhood,
      p_avatar_path: avatarPath,
      p_notification_prefs: profile.prefs
    });
    if (error) throw new Error(`Could not update profile: ${error.message}`);
    savedProfile = data;
  } catch (error) {
    if (avatarDataUrl) await discardPhoto(avatarPath);
    throw error;
  }
  requireCurrentUser(user.id);
  if (!savedProfile || savedProfile.id !== user.id) {
    throw new Error('Supabase did not return the saved profile for your account.');
  }
  let photoUrl = avatarPath === previousAvatarPath ? state.profile.photo : null;
  if (avatarPath && avatarPath !== previousAvatarPath) {
    try {
      photoUrl = (await signedPhotoUrls([avatarPath])).get(avatarPath) || null;
    } catch (error) {
      throw new Error(`Your profile was saved, but its private photo link could not be refreshed: ${error.message}`);
    }
  }
  requireCurrentUser(user.id);
  state.profile = {
    ...state.profile,
    name: savedProfile.display_name,
    hood: savedProfile.neighborhood,
    photo: photoUrl,
    avatarPath: savedProfile.avatar_path,
    prefs: { ...defaultPrefs(), ...profile.prefs }
  };
  state.people[user.id] = savedProfile.display_name || 'A neighbor';
  state.communityProfiles = state.communityProfiles.map(item => item.id === user.id
    ? { ...item, display_name: savedProfile.display_name, avatar_path: savedProfile.avatar_path }
    : item);
  state.profileStatus = 'ready';
  state.profileError = '';
  if (avatarDataUrl && previousAvatarPath && previousAvatarPath !== savedProfile.avatar_path) {
    await discardPhoto(previousAvatarPath);
  }
  return savedProfile;
}

async function setVolunteerRole(userId, enabled) {
  const adminId = sessionUser?.id;
  if (!adminId || !isAdmin()) throw new Error('Administrator access is required to manage volunteer roles.');
  requireCurrentUser(adminId);
  const { error } = await backend().rpc('cs_admin_set_volunteer', {
    p_user_id: userId,
    p_enabled: enabled
  });
  if (error) throw new Error(`Could not ${enabled ? 'grant' : 'remove'} volunteer access: ${error.message}`);
  requireCurrentUser(adminId);
}

async function submitReportFlag(reportId, reason, details) {
  const userId = sessionUser?.id;
  if (!userId) throw new Error('Sign in before flagging a report.');
  requireCurrentUser(userId);
  const { error } = await backend().rpc('cs_create_report_flag', {
    p_report_id: reportId,
    p_reason: reason,
    p_details: details
  });
  if (error) throw new Error(`Could not flag report: ${error.message}`);
  requireCurrentUser(userId);
}

async function markNotificationRead(notificationId) {
  unwrap(await backend().from('cs_notifications').update({ is_read: true })
    .eq('id', notificationId).select('id').single(), 'Could not mark notification as read');
}

async function markAllNotificationsRead() {
  unwrap(await backend().from('cs_notifications').update({ is_read: true })
    .eq('user_id', sessionUser.id).eq('is_read', false).select('id'), 'Could not mark notifications as read');
}

async function addMilestoneNotification(message) {
  const { error } = await backend().rpc('cs_add_milestone_notification', { p_message: message });
  if (error) throw new Error(`Could not save milestone notification: ${error.message}`);
}
