-- SPEC 07: se desactiva la pieza tuerca; la descripción del catálogo ya no la menciona.
update public.games
set long = 'Piezas de cuatro bloques caen sobre un tablero de 10 × 20. Muévelas, rótalas y déjalas caer para completar filas y borrarlas. Cada 10 líneas sube el nivel y la caída se acelera.'
where id = 'tetris';
