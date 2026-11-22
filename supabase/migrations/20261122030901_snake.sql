-- SPEC 10: juego real Víbora (snake) y política de insert ampliada.

insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('snake', 'VÍBORA',
   'Come fruta, crece y no choques contigo misma.',
   'Guía a la víbora con las flechas por un tablero de 20×15. Cada fruta que come la hace crecer una casilla y suma 10 puntos; cada 5 frutas subes de nivel y ella se mueve más rápido. Si choca con una pared o con su propio cuerpo, se acaba la partida.',
   'ARCADE', 'cover-snake', 'green', 3);

-- Cada juego real nuevo añade su id a esta lista.
drop policy "scores_insert_real_games" on public.scores;
create policy "scores_insert_real_games" on public.scores
  for insert to anon, authenticated
  with check (game_id in ('asteroids', 'tetris', 'arkanoid', 'snake'));
