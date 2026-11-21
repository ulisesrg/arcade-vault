-- Quita los 8 juegos simulados (spec 08). Sin cascade: si alguno tuviera
-- puntuaciones, la FK de scores.game_id hace fallar la migración.
delete from public.games
where id in ('bloque-buster', 'caida', 'serpentina', 'gloton',
             'invasores', 'rocas', 'ranaria', 'duelo-pixel');

-- sort_order es unique: 0 y 1 quedan libres tras el borrado.
update public.games set sort_order = 0 where id = 'asteroids';
update public.games set sort_order = 1 where id = 'tetris';
