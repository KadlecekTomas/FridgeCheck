alter table public.stock_targets
  add column expected_daily_consumption numeric(14,3) not null default 0
  check (expected_daily_consumption >= 0);

comment on column public.stock_targets.expected_daily_consumption is
  'Expected household consumption per day in stock_targets.unit. Used as a planning assumption, not as observed inventory history.';
