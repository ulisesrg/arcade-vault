-- SPEC 09: juego real Rompebloques (arkanoid) y política de insert ampliada.

insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('arkanoid', 'ROMPEBLOQUES',
   'Devuelve la bola con la paleta y rompe todo el muro.',
   'Mueve la paleta para que la bola no caiga y rompe todos los bloques. Tienes 3 vidas y cinco niveles con patrones distintos; en cada nivel la bola va más rápida.',
   'ARCADE', 'cover-arkanoid', 'magenta', 2);

-- Cada juego real nuevo añade su id a esta lista.
drop policy "scores_insert_real_games" on public.scores;
create policy "scores_insert_real_games" on public.scores
  for insert to anon, authenticated
  with check (game_id in ('asteroids', 'tetris', 'arkanoid'));
