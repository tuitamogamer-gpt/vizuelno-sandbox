"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="error-page"><span className="eyebrow">NEŠTO JE ZAPINJALO</span><h1>Pokušajmo ponovo.</h1><p>Tvoji sačuvani projekti ostaju u ovom pregledniku.</p><button className="button primary" onClick={reset}>Ponovo učitaj</button></main>; }
