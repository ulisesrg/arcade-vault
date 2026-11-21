-- SPEC 07: juego real Tetris (APILADOR) y política de insert por lista de ids.

insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('tetris', 'APILADOR',
   'Apila las piezas y limpia líneas antes de llegar al techo.',
   'Piezas de cuatro bloques caen sobre un tablero de 10 × 20. Muévelas, rótalas y déjalas caer para completar filas y borrarlas. Cada 10 líneas sube el nivel y la caída se acelera. Vigila la tuerca: una pieza especial en anillo de ocho bloques.',
   'PUZZLE', 'cover-tetris', 'yellow', 9);

-- Cada juego real nuevo añade su id a esta lista.
drop policy "scores_insert_asteroids" on public.scores;
create policy "scores_insert_real_games" on public.scores
  for insert to anon, authenticated
  with check (game_id in ('asteroids', 'tetris'));
