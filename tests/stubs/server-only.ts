// Prázdna náhrada za balík "server-only" počas testov (vitest.config.ts).
// V aplikácii tento balík zabezpečuje, že sa serverový kód nikdy nedostane
// do prehliadača; v testoch beží všetko v Node, takže stačí prázdny modul.
export {};
