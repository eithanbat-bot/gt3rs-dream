-- Production migration applied 2026-11-02.
CREATE OR REPLACE FUNCTION public.submit_lead_atomic(p_ip_fingerprint text, p_email_fingerprint text, p_business_name text, p_contact_name text, p_email text, p_phone text, p_industry text, p_monthly_enquiries text, p_current_process text, p_challenge text, p_utm_source text, p_utm_medium text, p_utm_campaign text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_now timestamptz;
  v_ip_count bigint;
  v_email_count bigint;
  v_global_count bigint;
  v_lead_id uuid;
begin
  if p_ip_fingerprint !~ '^[0-9a-f]{64}$'
     or p_email_fingerprint !~ '^[0-9a-f]{64}$'
     or char_length(p_business_name) not between 2 and 120
     or char_length(p_contact_name) not between 2 and 100
     or char_length(p_email) not between 5 and 180
     or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]{2,}$'
     or p_email <> lower(p_email)
  then
    return jsonb_build_object('status','invalid');
  end if;

  -- Serializes the low-volume global quota, preventing concurrent double acceptance.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('leadlift_inbound_submit_global_v1'));
  v_now := pg_catalog.clock_timestamp();
  select count(*) into v_ip_count
    from public.lead_submission_attempts
    where ip_fingerprint=p_ip_fingerprint and created_at >= v_now - interval '15 minutes';
  select count(*) into v_email_count
    from public.lead_submission_attempts
    where email_fingerprint=p_email_fingerprint and created_at >= v_now - interval '24 hours';
  select count(*) into v_global_count
    from public.lead_submission_attempts
    where created_at >= v_now - interval '1 hour';
  if v_ip_count >= 5 or v_email_count >= 1 or v_global_count >= 60 then
    return jsonb_build_object('status','rate_limited','retry_after_seconds',
      case when v_email_count >= 1 then 86400 when v_ip_count >= 5 then 900 else 3600 end);
  end if;

  insert into public.inbound_leads(
    business_name, contact_name, email, phone, industry, monthly_enquiries,
    current_process, challenge, source, utm_source, utm_medium, utm_campaign,
    consent_to_contact, consent_at
  ) values (
    p_business_name, p_contact_name, p_email, nullif(p_phone,''),
    coalesce(nullif(p_industry,''),'Other'), coalesce(nullif(p_monthly_enquiries,''),'Not sure'),
    nullif(p_current_process,''), nullif(p_challenge,''), 'gt3rs-marketing-site',
    nullif(p_utm_source,''), nullif(p_utm_medium,''), nullif(p_utm_campaign,''),
    true, v_now
  ) returning id into v_lead_id;

  insert into public.lead_submission_attempts(ip_fingerprint,email_fingerprint,action)
  values (p_ip_fingerprint,p_email_fingerprint,'submitted');

  return jsonb_build_object('status','saved','lead_id',v_lead_id);
end;
$function$
;

revoke all on function public.submit_lead_atomic(text,text,text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_lead_atomic(text,text,text,text,text,text,text,text,text,text,text,text,text) to service_role;
