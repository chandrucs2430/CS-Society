select jsonb_pretty(jsonb_build_object(
  'columns', coalesce((
    select jsonb_agg(to_jsonb(c) order by c.table_schema, c.table_name, c.ordinal_position)
    from information_schema.columns c
    where (c.table_schema = 'public' and c.table_name in (
      'profiles', 'cs_profiles', 'cs_profile_settings', 'cs_profile_roles'
    ))
  ), '[]'::jsonb),

  'row_level_security', coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'table', t.relname,
      'enabled', t.relrowsecurity,
      'forced', t.relforcerowsecurity
    ) order by n.nspname, t.relname)
    from pg_class t
    join pg_namespace n on n.oid = t.relnamespace
    where t.relkind in ('r', 'p')
      and (
        (n.nspname = 'public' and t.relname in (
          'profiles', 'cs_profiles', 'cs_profile_settings', 'cs_profile_roles'
        ))
        or (n.nspname = 'storage' and t.relname = 'objects')
      )
  ), '[]'::jsonb),

  'policies', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.schemaname, p.tablename, p.policyname)
    from pg_policies p
    where (p.schemaname = 'public' and p.tablename in (
      'profiles', 'cs_profiles', 'cs_profile_settings', 'cs_profile_roles'
    ))
    or (p.schemaname = 'storage' and p.tablename = 'objects')
  ), '[]'::jsonb),

  'triggers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'table', t.relname,
      'name', g.tgname,
      'definition', pg_get_triggerdef(g.oid),
      'function', pn.nspname || '.' || pr.proname
    ) order by n.nspname, t.relname, g.tgname)
    from pg_trigger g
    join pg_class t on t.oid = g.tgrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_proc pr on pr.oid = g.tgfoid
    join pg_namespace pn on pn.oid = pr.pronamespace
    where not g.tgisinternal
      and (
        (n.nspname = 'auth' and t.relname = 'users')
        or (n.nspname = 'public' and t.relname in (
          'profiles', 'cs_profiles', 'cs_profile_settings', 'cs_profile_roles'
        ))
      )
  ), '[]'::jsonb),

  'profile_functions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', n.nspname || '.' || p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'return_type', pg_get_function_result(p.oid),
      'security_definer', p.prosecdef,
      'settings', p.proconfig
    ) order by p.proname)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'cs\_%profile%' escape '\'
  ), '[]'::jsonb),

  'table_grants', coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', g.table_schema,
      'table', g.table_name,
      'grantee', g.grantee,
      'privilege', g.privilege_type
    ) order by g.table_schema, g.table_name, g.grantee, g.privilege_type)
    from information_schema.role_table_grants g
    where (g.table_schema = 'public' and g.table_name in (
      'profiles', 'cs_profiles', 'cs_profile_settings', 'cs_profile_roles'
    ))
  ), '[]'::jsonb),

  'column_grants', coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', g.table_schema,
      'table', g.table_name,
      'column', g.column_name,
      'grantee', g.grantee,
      'privilege', g.privilege_type
    ) order by g.table_schema, g.table_name, g.column_name, g.grantee, g.privilege_type)
    from information_schema.column_privileges g
    where g.table_schema = 'public' and g.table_name in (
      'profiles', 'cs_profiles', 'cs_profile_settings', 'cs_profile_roles'
    )
  ), '[]'::jsonb),

  'photo_bucket', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.id,
      'public', b.public,
      'file_size_limit', b.file_size_limit,
      'allowed_mime_types', b.allowed_mime_types
    ))
    from storage.buckets b
    where b.id = 'cs-report-photos'
  ), '[]'::jsonb)
));