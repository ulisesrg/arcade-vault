-- SPEC 06: tablas games y scores, vista games_with_stats, RLS y seed del catálogo.

create table public.games (
  id         text primary key,                       -- slug de la URL, p. ej. 'asteroids'
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,                          -- clase CSS, p. ej. 'cover-asteroids'
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order integer not null unique                 -- orden del catálogo (0..8)
);

create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games(id),
  name       text not null check (char_length(name) between 1 and 10),
  score      integer not null check (score >= 0 and score <= 10000000),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at asc);

-- best y plays se calculan; security_invoker evita saltarse RLS.
create view public.games_with_stats with (security_invoker = on) as
  select g.*, coalesce(max(s.score), 0) as best, count(s.id) as plays
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

-- RLS
alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public" on public.games
  for select to anon, authenticated
  using (true);

create policy "scores_select_public" on public.scores
  for select to anon, authenticated
  using (true);

-- Solo se permite insertar puntajes de juegos reales (cada juego nuevo añade su id aquí).
create policy "scores_insert_asteroids" on public.scores
  for insert to anon, authenticated
  with check (game_id = 'asteroids');

-- Seed: los 9 juegos del catálogo actual, en su orden original.
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('bloque-buster', 'BLOQUE BUSTER', 'Rebota la pelota y destruye muros de neón.',
   'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
   'ARCADE', 'cover-bricks', 'cyan', 0),
  ('caida', 'CAÍDA', 'Encaja las piezas antes de que el techo te aplaste.',
   'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
   'PUZZLE', 'cover-tetro', 'magenta', 1),
  ('serpentina', 'SERPENTINA', 'Crece sin morder tu propia cola.',
   'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
   'ARCADE', 'cover-snake', 'green', 2),
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.',
   'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
   'ARCADE', 'cover-glot', 'yellow', 3),
  ('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.',
   'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
   'SHOOTER', 'cover-invaders', 'green', 4),
  ('rocas', 'ROCAS', 'Pulveriza asteroides en gravedad cero.',
   'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
   'SHOOTER', 'cover-rocas', 'yellow', 5),
  ('ranaria', 'RANARIA', 'Cruza la autopista de pixeles.',
   'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
   'ARCADE', 'cover-rana', 'green', 6),
  ('duelo-pixel', 'DUELO PIXEL', 'Dos paletas. Una pelota. Reflejos máximos.',
   'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
   'VERSUS', 'cover-duelo', 'cyan', 7),
  ('asteroids', 'ASTEROIDS', 'Destroza el campo de asteroides sin chocar.',
   'Pilota una nave en un espacio sin bordes: lo que sale por un lado entra por el otro. Dispara a los asteroides grandes para partirlos en medianos y pequeños, recoge el power-up 3x para disparar en abanico y sobrevive con tus 3 vidas.',
   'SHOOTER', 'cover-asteroids', 'cyan', 8);
