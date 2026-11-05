-- Commit the enum addition before the following migration uses its value.
alter type public.show_status add value if not exists 'coming_soon';
