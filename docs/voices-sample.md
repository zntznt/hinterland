# Voices from the People — prototype sample (#136 gate)

`voices-proto.mjs`, scratchpad, **zero app changes**. Generated against real exports of
`index.html` captured through the `gen()` pattern from `tools/lib.mjs`. The RNG
(`hashStr`/`mulberry32`/`streams`) and the coiner (`NAME_CORPUS`/`buildChain`/
`chainWalk`/`markovWord`) are pulled out of `index.html` by anchored regex — 10738 bytes,
8 registers — so every voice is recomputable from the export + `index.html`, and a
moved symbol fails loudly instead of silently forking.

Pools: **full (135 oral + 116 written = 251 fragments, every fragment slotted)**. Seeds `atlas-1`, `v6-2`, `v6-5`, 24 regions, 10 epochs, 50 voices per seed.

Paragraphs are printed for `atlas-1` (the 50 the gate asks to be read); the other 2 seeds contribute their invariants. `--all-prose` prints every seed.


## Seed `atlas-1` — 50 voices

> world: metropole the Osmark Combine · rival the Verrant Hegemony · exchange Quill Exchange · gazette The Obsensign · precinct Ballard Precinct · regime `trade_war` · price index 0.783 · imperial attention 0.5
>
> world-coins (oaths, minted once per world per register): lowland Gle/Wick/Sor · frontier Strek/Thar/Dhok · temple Sonne/Mine/Calle · corporate Lum/Rynd/Ledel · precinct Quen/Ben/Lion · gazette Sign/Dige/Her · chthonic Moth/Nyxar/Under · imperial Trimo/Ine/Cine
>
> imperial coins (the Concordat tongue, one corpus): Solmaro, Cine, Aurecht, Pravine


### 1. Briarlstead the Lofted — *aggrieved*

> S_oral **-20** · D 39 · lead `sky` (achievement inflated) · skew +39 → S_written **+19** · skin `works-town`
>
> columns: wealth 9 · toll 39 · blight 27 · burden 56.8/1k · trust 33 · legib 64 · works 0 · decline

**ORAL** — You'll not hear this from Ophienne's assessor. We hold the Briarlstead deeds ourselves, whatever they hold elsewhere. Say what you like: there's a story in Briarlstead that Ophienne's assessor's own household is not counted either. The rent takes half of a quarry-work wage in Briarlstead before the first shift is worked, same as the last shift. My father called Briarlstead by the old name and would not use the new one. That is the whole of it, and you may check it yourself.

**WRITTEN** — Assessment of Briarlstead, entered against the standing schedule. The reduction in Briarlstead vacancy is attributed to the administration's measures; as the works reports, traffic on the Salt Road is returned as the district's principal land carriage. The injustice index for Briarlstead returns 25, within the range Ophienne has accepted before. The office asks leave to enumerate the northern quarter of Briarlstead afresh, so entered. The elite share of Briarlstead receipts is 19, unchanged in form: persons standing outside the Briarlstead count stand also outside the levy, and the office notes the saving. No further Briarlstead particulars are required at this time.

| path | true | told | rule |
|---|---|---|---|
| attribution | world price_index 0.783 and grid_access 100 | Ophienne's assessor | blame-shift: nearest visible named institution (§2) |
| toll | 39 | half | folk ×1.66 |
| injustice | 25 | 25 | written: verbatim |
| elite | 19 | 19 | written: verbatim |


### 2. Dhulzak the Lofted — *steady*

> S_oral **+19** · D 11 · lead `sky` (achievement inflated) · skew +11 → S_written **+30** · skin `works-town`
>
> columns: wealth 12 · toll 39 · blight 10 · burden 39.2/1k · trust 70 · legib 15 · works 0 · stable

**ORAL** — You'll not hear this from the constabulary. They say Cramwick has never once had to send a constable up to Dhulzak; they say the constables were paid twice this quarter in Dhulzak and the healers not at all. We hold the Dhulzak deeds ourselves, whatever they hold elsewhere; my father called Dhulzak by the old name and would not use the new one. Between lifts, the Osmark Combine sets the grade and Quill Exchange reads it out and Dhulzak lifts to it; word in Dhulzak is Cramwick will not hold the seat past the next reckoning. And let the constabulary put that in the digest.

**WRITTEN** — The office at Dhulzak reports as follows. Dhulzak has met its schedule without recourse to Cramwick; as the works reports, wealth per head in Dhulzak is entered at 12 and is not the lowest in the circuit. Confidence among the holding class of Dhulzak is reported as firm: a hand in the margin gives the Dhulzak figure as queried and standing. The Dhulzak schedule stands until superseded.

| path | true | told | rule |
|---|---|---|---|
| attribution | world price_index 0.783 and grid_access 100 | the constabulary | blame-shift: nearest visible named institution (§2) |
| wealth | 12 | 12 | written: verbatim |


### 3. Pelvetchste the Steadfast — *weary*

> S_oral **+13** · D 6 · lead `elsewhere` (outward loss minimised) · skew +6 → S_written **+19** · skin `works-town`
>
> columns: wealth 16 · toll 25 · blight 35 · burden 37.2/1k · trust 80 · legib 7 · works 0 · stable

**ORAL** — Sit where the light is and mind the sill — this is Pelvetchste. Since the third whistle, the boats that pass Pelvetchste do not stop, and they are going somewhere; they say Quill Exchange moved the grade on Pelvetchste and told nobody. The rent takes a quarter part of a freight and factoring wage in Pelvetchste before the first shift is worked — and that's the tally. The ground gives under the north field of Pelvetchste and always has. They say Cramwick has never once had to send a constable up to Pelvetchste; the freight and factoring barges leave Pelvetchste before light and you can set a clock by them. And there's nobody to say otherwise who has stood in Pelvetchste.

**WRITTEN** — Pelvetchste, district return for the quarter. The Verrant Hegemony's tariff is cited by the Pelvetchste traders and is not a matter for this office. Potable supply at Pelvetchste is assessed at 56 — on the plant's own figures. Service provision at Pelvetchste is scored at 33 against need. Persons standing outside the Pelvetchste count stand also outside the levy, and the office notes the saving. The Pelvetchste schedule stands until superseded.

| path | true | told | rule |
|---|---|---|---|
| toll | 25 | a quarter part | folk |
| safewater | 56 | 56 | written: verbatim |
| servicegap | 33 | 33 | written: verbatim |


### 4. Osteaste the Open — *weary*

> S_oral **+12** · D 6 · lead `elsewhere` (outward loss minimised) · skew +6 → S_written **+18** · skin `works-town`
>
> columns: wealth 18 · toll 28 · blight 49 · burden 36.4/1k · trust 80 · legib 7 · works 0 · stable

**ORAL** — Sit where the light is and mind the sill — this is Osteaste. My cousin writes that the freight and factoring out there is worse and the pay is better. Word in Osteaste is Cramwick will not hold the seat past the next reckoning. The Ore Road ran free in my mother's day and the Crown's assessor has a booth on it now. And the freight and factoring barges leave Osteaste before light and you can set a clock by them. There's a lamp where the Ore Road enters Osteaste that wasn't there two winters back. And I have walked the Ore Road in every weather there is. That is not a complaint, it is a measurement.

**WRITTEN** — Digest of conditions at Osteaste, prepared for Cramwick. The Osteaste grade is that published by Quill Exchange and is not the office's to revise. Traffic on the Ore Road is returned as the district's principal land carriage — per the shift return. Of Osteaste's 5286 souls, some 111 decline enumeration. Complaint of the Osteaste Bridge levy is of long standing and is of the district's ordinary character. Entered, and the Osteaste file closed for the quarter.

| path | true | told | rule |
|---|---|---|---|
| attribution | market_access 100 | the Crown's assessor | blame-shift: nearest visible named institution (§2) |
| pop | 5286 | 5286 | written: verbatim |
| uncounted | 111 | 111 | written: verbatim |


### 5. Theresderby the Lofted — *aggrieved*

> S_oral **-11** · D 24 · lead `smuggling` (constabulary inflates disorder) · skew +24 → S_written **+13** · skin `works-town`
>
> columns: wealth 13 · toll 28 · blight 25 · burden 16.2/1k · trust 45 · legib 34 · works 0 · decline

**ORAL** — You'll not hear this from the constabulary. There's a price for anything out of Theresderby if you know which door at Ballard Precinct — my father called Theresderby by the old name and would not use the new one. Word in Theresderby is Cramwick will not hold the seat past the next reckoning. Come back to Theresderby in ten years and see which of us was right.

**WRITTEN** — Digest of conditions at Theresderby, prepared for Cramwick. Social trust in Theresderby is scored 45 by the standing instrument; per the shift return, the interruption at Theresderby is recorded as a variance in the schedule rather than a stoppage. Plant note: grid connection at Theresderby is complete and the benefit is already legible in the returns; the injustice index for Theresderby returns 22, within the range Cramwick has accepted before. The reduction in Theresderby vacancy is attributed to the administration's measures; a hand in the margin gives the Theresderby figure as queried and standing. The Theresderby schedule stands until superseded.

| path | true | told | rule |
|---|---|---|---|
| attribution | market_access 10 | the constabulary | blame-shift: nearest visible named institution (§2) |
| trust | 45 | 45 | written: verbatim |
| injustice | 22 | 22 | written: verbatim |


### 6. Glefold-on-Pellowfolt the Kindled — *weary*

> S_oral **+11** · D 7 · lead `works` (achievement inflated) · skew +7 → S_written **+18** · skin `works-town`
>
> columns: wealth 29 · toll 18 · blight 61 · burden 14.6/1k · trust 75 · legib 8 · works 99 · stable

**ORAL** — There's what the office writes and there's what Glefold-on-Pellowfolt knows. Glefold-on-Pellowfolt feeds itself now, and that is not nothing, shift on shift. You learn the smell of a bad shift at the Glefold-on-Pellowfolt line before the bell says so. There's works here and none of it stays in Glefold-on-Pellowfolt. The ground gives under the north field of Glefold-on-Pellowfolt and always has, and there it is. Glefold-on-Pellowfolt will be here after the syndicate's factor, whatever the book says.

**WRITTEN** — The office at Glefold-on-Pellowfolt reports as follows. Shift return appended: the order level returned for Glefold-on-Pellowfolt is 50; the office anticipates the next Glefold-on-Pellowfolt assessment with confidence. Blight load for Glefold-on-Pellowfolt stands at 61 in the register. The affected ground about Glefold-on-Pellowfolt is reclassified rather than lost — on the plant's own figures. The Glefold-on-Pellowfolt account is balanced as shown.

| path | true | told | rule |
|---|---|---|---|
| attribution | world price_index 0.783 and grid_access 100 | the syndicate's factor | blame-shift: nearest visible named institution (§2) |
| order | 50 | 50 | written: verbatim |
| blight | 61 | 61 | written: verbatim |


### 7. Brokstead the Open — *weary*

> S_oral **+10** · D 8 · lead `elsewhere` (outward loss minimised) · skew +8 → S_written **+18** · skin `works-town`
>
> columns: wealth 16 · toll 25 · blight 49 · burden 39.4/1k · trust 78 · legib 10 · works 0 · stable

**ORAL** — I keep no ledger, so I'll tell it straight. The freight and factoring price is set somewhere it is always morning and in Brokstead it is always the same hour. Word in Brokstead is Cramwick will not hold the seat past the next reckoning. Since the third whistle, a third part of Brokstead ground will grow nothing a person should eat; the dust settles white on the Brokstead sills by the second day. That is not a complaint, it is a measurement.

**WRITTEN** — Prospectus note on Brokstead, for the attention of Quill Exchange. The price index against which Brokstead is assessed is entered at 0.783, as issued: social trust in Brokstead is scored 78 by the standing instrument. The elite share of Brokstead receipts is 23, unchanged in form. What mortality continues in Brokstead is booked under ordinary wastage — against the line schedule. The reduction in Brokstead vacancy is attributed to the administration's measures. Noted at the margin of the Brokstead return and read as ordinary — as the works reports. No further Brokstead particulars are required at this time.

| path | true | told | rule |
|---|---|---|---|
| blight | 49 | a third part | folk |
| price | 0.783 | 0.783 | written: verbatim |
| trust | 78 | 78 | written: verbatim |
| elite | 23 | 23 | written: verbatim |


### 8. Badereton the Shadowed — *weary*

> S_oral **+5** · D 23 · lead `burden` (harm minimised) · skew +23 → S_written **+28** · skin `works-town`
>
> columns: wealth 15 · toll 18 · blight 25 · burden 54.8/1k · trust 53 · legib 36 · works 0 · stable

**ORAL** — You want the truth of Badereton, stand at Rumderk Saddle at shift-change. The Crown's assessor sits the tally-booth and counts, and the counting has never once come out for Badereton, and half of Badereton speaks the old tongue at home and the other half pretends not to. I've carried the same grid-work load up the same Badereton stair for eleven years. The Badereton ground remembers longer than the register does.

**WRITTEN** — The ordinary return for Badereton, nothing extraordinary arising. Wealth per head in Badereton is entered at 15 and is not the lowest in the circuit. What mortality continues in Badereton is booked under ordinary wastage, without remark. The reduction in Badereton vacancy is attributed to the administration's measures. A hand in the margin gives the Badereton figure as queried and standing — as the works reports. The Obsensign of the period carried the notice and Badereton is deemed informed; against the line schedule, service provision at Badereton is scored at 73 against need. No further Badereton particulars are required at this time.

| path | true | told | rule |
|---|---|---|---|
| attribution | disease_burden_per_1k 54.8 against safe_water 45 | the Crown's assessor | blame-shift: nearest visible named institution (§2) |
| wealth | 15 | 15 | written: verbatim |
| servicegap | 73 | 73 | written: verbatim |


### 9. Zolgraddok — *weary*

> S_oral **+11** · D 9 · lead `grid` (achievement inflated) · skew +9 → S_written **+20** · skin `works-town`
>
> columns: wealth 17 · toll 28 · blight 31 · burden 14.8/1k · trust 74 · legib 12 · works 0 · stable

**ORAL** — You've come up the grid-work road into Zolgraddok, so you've seen the half of it already. We hold the Zolgraddok deeds ourselves, whatever they hold elsewhere — same hours either way. The ground gives under the north field of Zolgraddok and always has. My brother signed the recruiter's book out of Zolgraddok and his letter came with a stamp I can't read — there's a price for anything out of Zolgraddok if you know which door at Ballard Precinct. The Zolgraddok ground remembers longer than the register does.

**WRITTEN** — Zolgraddok, district return for the quarter. Zolgraddok has met its schedule without recourse to Cramwick; the Zolgraddok entry is initialled by an officer no longer of this district. The Obsensign of the period carried the notice and Zolgraddok is deemed informed — blight load for Zolgraddok stands at 31 in the register. The return is certified as prepared from the Zolgraddok register.

| path | true | told | rule |
|---|---|---|---|
| blight | 31 | 31 | written: verbatim |


### 10. Herow Ford the Gilded — *weary*

> S_oral **+2** · D 3 · lead `works` (achievement inflated) · skew +3 → S_written **+5** · skin `works-town`
>
> columns: wealth 32 · toll 14 · blight 61 · burden 12.5/1k · trust 79 · legib 0 · works 83 · decline

**ORAL** — Ask anyone on the Herow Ford side of the Craverwick and you'll hear it the same. Herow Ford feeds itself now, and that is not nothing. You can hear the Raverelfolt cables over Herow Ford sing in a hard wind, and there it is. They burn what Herow Ford lifts in streets that have never seen the Craverwick. Say what you like: word in Herow Ford is Cramwick will not hold the seat past the next reckoning. And Herow Ford goes on, because what else is there.

**WRITTEN** — The ordinary return for Herow Ford, nothing extraordinary arising. Social trust in Herow Ford is scored 79 by the standing instrument; as the works reports, grid connection at Herow Ford is complete and the benefit is already legible in the returns. The Herow Ford schedule follows the standard of the Osmark Combine and requires no local warrant; per the shift return, the injustice index for Herow Ford returns 41, within the range Cramwick has accepted before. Line schedule attached: traffic on the Herow Ford Road is returned as the district's principal land carriage; the discolouration of the Craverwick at Herow Ford is a known seasonal character of that water. The Herow Ford office remains at Cramwick's disposal.

| path | true | told | rule |
|---|---|---|---|
| trust | 79 | 79 | written: verbatim |
| injustice | 41 | 41 | written: verbatim |


### 11. Comfreton the Shadowed — *weary*

> S_oral **+1** · D 18 · lead `water` (harm minimised) · skew +18 → S_written **+19** · skin `works-town`
>
> columns: wealth 11 · toll 25 · blight 27 · burden 55.1/1k · trust 60 · legib 26 · works 0 · stable

**ORAL** — I'll give you Comfreton the way it is and not the way it reads. The healer is four days from Comfreton and Cramwick's assessor is here every quarter, and my father called Comfreton by the old name and would not use the new one. The rent takes a quarter part of a hauling and mill-work wage in Comfreton before the first shift is worked. So much for Cramwick's assessor's schedule.

**WRITTEN** — Assessment of Comfreton, entered against the standing schedule. Of Comfreton's 5704 souls, some 445 decline enumeration; Cramwick is asked to confirm the Comfreton schedule before the season turns. Shift return appended: the order level returned for Comfreton is 50; persons standing outside the Comfreton count stand also outside the levy, and the office notes the saving. The return is certified as prepared from the Comfreton register.

| path | true | told | rule |
|---|---|---|---|
| attribution | market_access 15 | Cramwick's assessor | blame-shift: nearest visible named institution (§2) |
| toll | 25 | a quarter part | folk |
| pop | 5704 | 5704 | written: verbatim |
| uncounted | 445 | 445 | written: verbatim |
| order | 50 | 50 | written: verbatim |


### 12. Skrakstead the Shadowed — *weary*

> S_oral **+0** · D 19 · lead `water` (harm minimised) · skew +19 → S_written **+19** · skin `works-town`
>
> columns: wealth 10 · toll 39 · blight 28 · burden 56.2/1k · trust 60 · legib 29 · works 0 · stable

**ORAL** — My people have been in Skrakstead four generations and I'll say this plain. The healer is four days from Skrakstead and Cramwick's assessor is here every quarter. The ground gives under the north field of Skrakstead and always has. The rent takes a third part of a quarry-work wage in Skrakstead before the first shift is worked, and my father called Skrakstead by the old name and would not use the new one. They say the constables were paid twice this quarter in Skrakstead and the healers not at all. Write that down if you're writing anything.

**WRITTEN** — Skrakstead, district return for the quarter. Market access for Skrakstead is scored at 15 against the standing table. Leave is sought to retain a portion of Skrakstead receipts against local works. Service provision at Skrakstead is scored at 70 against need; as the works reports, persons standing outside the Skrakstead count stand also outside the levy, and the office notes the saving. The Skrakstead matter is referred to the Osmark Combine and the office awaits instruction.

| path | true | told | rule |
|---|---|---|---|
| attribution | market_access 15 | Cramwick's assessor | blame-shift: nearest visible named institution (§2) |
| toll | 39 | a third part | folk |
| market | 15 | 15 | written: verbatim |
| servicegap | 70 | 70 | written: verbatim |


### 13. Comfre — *weary*

> S_oral **+8** · D 7 · lead `water` (harm minimised) · skew +7 → S_written **+15** · skin `works-town`
>
> columns: wealth 13 · toll 25 · blight 30 · burden 45.8/1k · trust 75 · legib 7 · works 0 · stable

**ORAL** — I'll give you Comfre the way it is and not the way it reads. The rent takes a quarter part of a hauling and mill-work wage in Comfre before the first shift is worked; the ground gives under the north field of Comfre and always has. The healer is four days from Comfre and the constabulary is here every quarter, shift on shift. My father called Comfre by the old name and would not use the new one. Come back to Comfre in ten years and see which of us was right.

**WRITTEN** — Return of Comfre, submitted on the standard form of the Osmark Combine. Wealth per head in Comfre is entered at 13 and is not the lowest in the circuit. An extension of the grid to the lower rows of Comfre is respectfully urged. Service provision at Comfre is scored at 51 against need. Persons standing outside the Comfre count stand also outside the levy, and the office notes the saving. Grid connection at Comfre is complete and the benefit is already legible in the returns. The Comfre entry is initialled by an officer no longer of this district, so entered. Assessment of Comfre proceeds upon the counted.

| path | true | told | rule |
|---|---|---|---|
| toll | 25 | a quarter part | folk |
| attribution | market_access 39 | the constabulary | blame-shift: nearest visible named institution (§2) |
| wealth | 13 | 13 | written: verbatim |
| servicegap | 51 | 51 | written: verbatim |


### 14. Welwick Height — *weary*

> S_oral **+8** · D 5 · lead `elsewhere` (outward loss minimised) · skew +5 → S_written **+13** · skin `works-town`
>
> columns: wealth 14 · toll 32 · blight 36 · burden 40.8/1k · trust 79 · legib 3 · works 0 · stable

**ORAL** — You've come up the freight and factoring road into Welwick Height, so you've seen the half of it already. Half the pay that keeps this row of Welwick Height comes in from off the map, same hours either way. They say the constables were paid twice this quarter in Welwick Height and the healers not at all. The rent takes a quarter part of a freight and factoring wage in Welwick Height before the first shift is worked. And the ground gives under the north field of Welwick Height and always has. They say Cramwick has never once had to send a constable up to Welwick Height — and the line runs. The freight and factoring barges leave Welwick Height before light and you can set a clock by them. That is not a complaint, it is a measurement.

**WRITTEN** — The office at Welwick Height reports as follows. The Obsensign of the period carried the notice and Welwick Height is deemed informed. Outward registration of labour from Welwick Height is noted at 195 in the period, so entered. Social trust in Welwick Height is scored 79 by the standing instrument. Cramwick is asked to confirm the Welwick Height schedule before the season turns, so entered. The return is certified as prepared from the Welwick Height register.

| path | true | told | rule |
|---|---|---|---|
| toll | 32 | a quarter part | folk |
| emig | 195 | 195 | written: verbatim |
| trust | 79 | 79 | written: verbatim |


### 15. Hamhold — *weary*

> S_oral **+7** · D 8 · lead `elsewhere` (outward loss minimised) · skew +8 → S_written **+15** · skin `works-town`
>
> columns: wealth 14 · toll 35 · blight 36 · burden 45.3/1k · trust 74 · legib 9 · works 0 · stable

**ORAL** — I keep no ledger, so I'll tell it straight. My cousin writes that the freight and factoring out there is worse and the pay is better. And word in Hamhold is Cramwick will not hold the seat past the next reckoning. The rent takes a third part of a freight and factoring wage in Hamhold before the first shift is worked; the freight and factoring barges leave Hamhold before light and you can set a clock by them. Hamhold will be here after the constabulary, whatever the book says.

**WRITTEN** — Return of Hamhold, submitted on the standard form of the Osmark Combine. Works district: the standard by which Hamhold water is judged potable is the imperial one; the elite share of Hamhold receipts is 21, unchanged in form. The order level returned for Hamhold is 50: leave is sought to retain a portion of Hamhold receipts against local works. Market access for Hamhold is scored at 72 against the standing table. Departures from Hamhold are entered as the ordinary circulation of an expanding trade, so entered. Submitted from Hamhold without remark.

| path | true | told | rule |
|---|---|---|---|
| toll | 35 | a third part | folk |
| attribution | market_access 72 | the constabulary | blame-shift: nearest visible named institution (§2) |
| elite | 21 | 21 | written: verbatim |
| order | 50 | 50 | written: verbatim |
| market | 72 | 72 | written: verbatim |


### 16. Mookby — *weary*

> S_oral **+6** · D 5 · lead `elsewhere` (outward loss minimised) · skew +5 → S_written **+11** · skin `works-town`
>
> columns: wealth 13 · toll 32 · blight 36 · burden 42/1k · trust 77 · legib 4 · works 0 · stable

**ORAL** — There's what the office writes and there's what Mookby knows. My brother signed the recruiter's book out of Mookby and his letter came with a stamp I can't read. There's a price for anything out of Mookby if you know which door at Ballard Precinct. The rent takes a quarter part of a freight and factoring wage in Mookby before the first shift is worked. I remember when the Drought came through Mookby. At the line's end, they say Cramwick has never once had to send a constable up to Mookby; my father called Mookby by the old name and would not use the new one. Mookby knows what it is owed, if not when.

**WRITTEN** — Prospectus note on Mookby, for the attention of Quill Exchange. The price index against which Mookby is assessed is entered at 0.783, as issued. Potable supply at Mookby is assessed at 43, without remark. The elite share of Mookby receipts is 24, unchanged in form. Cramwick is asked to confirm the Mookby schedule before the season turns — per the shift return. The Mookby matter is referred to the Osmark Combine and the office awaits instruction.

| path | true | told | rule |
|---|---|---|---|
| toll | 32 | a quarter part | folk |
| event | the Drought of 1175 | the Drought | oral: year dropped, name kept |
| price | 0.783 | 0.783 | written: verbatim |
| safewater | 43 | 43 | written: verbatim |
| elite | 24 | 24 | written: verbatim |


### 17. Netchfor — *weary*

> S_oral **+5** · D 10 · lead `water` (harm minimised) · skew +10 → S_written **+15** · skin `works-town`
>
> columns: wealth 12 · toll 32 · blight 27 · burden 50.7/1k · trust 72 · legib 13 · works 0 · stable

**ORAL** — There's what the office writes and there's what Netchfor knows. The healer is four days from Netchfor and Cramwick's assessor is here every quarter; my father called Netchfor by the old name and would not use the new one. The rent takes a quarter part of a hauling and mill-work wage in Netchfor before the first shift is worked. And there's nobody to say otherwise who has stood in Netchfor.

**WRITTEN** — Return of Netchfor, submitted on the standard form of the Osmark Combine. Social trust in Netchfor is scored 72 by the standing instrument: Cramwick is asked to confirm the Netchfor schedule before the season turns. Potable supply at Netchfor is assessed at 44; on the plant's own figures, departures from Netchfor are entered as the ordinary circulation of an expanding trade. Netchfor has met its schedule without recourse to Cramwick; as the works reports, a hand in the margin gives the Netchfor figure as queried and standing. Netchfor is found to be in the ordinary condition.

| path | true | told | rule |
|---|---|---|---|
| attribution | market_access 33 | Cramwick's assessor | blame-shift: nearest visible named institution (§2) |
| toll | 32 | a quarter part | folk |
| trust | 72 | 72 | written: verbatim |
| safewater | 44 | 44 | written: verbatim |


### 18. Withenby — *weary*

> S_oral **+1** · D 5 · lead `blight` (harm minimised) · skew +5 → S_written **+6** · skin `works-town`
>
> columns: wealth 14 · toll 32 · blight 46 · burden 39.6/1k · trust 79 · legib 5 · works 0 · stable

**ORAL** — I'll give you Withenby the way it is and not the way it reads. A third part of Withenby ground will grow nothing a person should eat — the ground gives under the north field of Withenby and always has. My brother signed the recruiter's book out of Withenby and his letter came with a stamp I can't read; there's a price for anything out of Withenby if you know which door at Ballard Precinct. Withenby buried the old quarrel and the two banks of the Craverwick trade again. The dust settles white on the Withenby sills by the second day. Withenby knows what it is owed, if not when.

**WRITTEN** — The office at Withenby reports as follows. Works district: market access for Withenby is scored at 50 against the standing table; arrears in the Withenby healer's circuit are a scheduling matter and not a provision matter. The form is the Osmark Combine's; the office notes only that Withenby has completed it; service provision at Withenby is scored at 38 against need. The Withenby matter is referred to the Osmark Combine and the office awaits instruction.

| path | true | told | rule |
|---|---|---|---|
| blight | 46 | a third part | folk |
| market | 50 | 50 | written: verbatim |
| servicegap | 38 | 38 | written: verbatim |


### 19. Briarlstead the Lofted (second pair) — *aggrieved*

> S_oral **-20** · D 39 · lead `burden` (harm minimised) · skew +39 → S_written **+19** · skin `works-town`
>
> columns: wealth 9 · toll 39 · blight 27 · burden 56.8/1k · trust 33 · legib 64 · works 0 · decline

**ORAL** — You'll not hear this from Ophienne's assessor. A quarter part of Briarlstead is not in the book at all, and it suits Ophienne's assessor, same as the last shift. Half of Briarlstead speaks the old tongue at home and the other half pretends not to. There's a lamp where the Salt Road enters Briarlstead that wasn't there two winters back, and I remember when the Great Storm came through Briarlstead. Briarlstead will be here after Ophienne's assessor, whatever the book says.

**WRITTEN** — Briarlstead, health and works, quarterly. Traffic on the Salt Road is returned as the district's principal land carriage. The register's silence on the northern quarter of Briarlstead is not evidence of absence, without remark. Grid connection at Briarlstead is complete and the benefit is already legible in the returns; the Briarlstead margin carries a second hand, unsigned. Briarlstead is found to be in the ordinary condition.

| path | true | told | rule |
|---|---|---|---|
| attribution | disease_burden_per_1k 56.8 against safe_water 43 | Ophienne's assessor | blame-shift: nearest visible named institution (§2) |
| uncounted | 904 | a quarter part | folk ×1.66 |
| event | the Great Storm of 1225 | the Great Storm | oral: year dropped, name kept |


### 20. Dhulzak the Lofted (second pair) — *steady*

> S_oral **+19** · D 11 · lead `burden` (harm minimised) · skew +11 → S_written **+30** · skin `works-town`
>
> columns: wealth 12 · toll 39 · blight 10 · burden 39.2/1k · trust 70 · legib 15 · works 0 · stable

**ORAL** — There's what the office writes and there's what Dhulzak knows. Dhulzak pays for the lamp and the lamp is in the constabulary's street, third whistle to third whistle. My father called Dhulzak by the old name and would not use the new one. The rent takes a third part of a hauling and mill-work wage in Dhulzak before the first shift is worked, and the count holds. The hauling and mill-work barges leave Dhulzak before light and you can set a clock by them. The healer is four days from Dhulzak and the constabulary is here every quarter — you can hear the Raverelfolt cables over Dhulzak sing in a hard wind. Dhulzak knows what it is owed, if not when.

**WRITTEN** — Dhulzak, district return for the quarter. Of Dhulzak's 591 souls, some 27 decline enumeration; what mortality continues in Dhulzak is booked under ordinary wastage. Disease burden at Dhulzak is returned at 39.2 in the thousand, and persons standing outside the Dhulzak count stand also outside the levy, and the office notes the saving. Market access for Dhulzak is scored at 42 against the standing table; as the works reports, departures from Dhulzak are entered as the ordinary circulation of an expanding trade. Submitted from Dhulzak without remark.

| path | true | told | rule |
|---|---|---|---|
| attribution | disease_burden_per_1k 39.2 against safe_water 47 | the constabulary | blame-shift: nearest visible named institution (§2) |
| toll | 39 | a third part | folk |
| pop | 591 | 591 | written: verbatim |
| uncounted | 27 | 27 | written: verbatim |
| burden | 39.2 | 39.2 | written: verbatim |
| market | 42 | 42 | written: verbatim |


### 21. Pelvetchste the Steadfast (second pair) — *weary*

> S_oral **+13** · D 6 · lead `grid` (harm minimised) · skew +6 → S_written **+19** · skin `works-town`
>
> columns: wealth 16 · toll 25 · blight 35 · burden 37.2/1k · trust 80 · legib 7 · works 0 · stable

**ORAL** — Sit where the light is and mind the sill — this is Pelvetchste. The Craverwick runs clean past the second bend below Pelvetchste and Cramwick's people saw to it, and my father called Pelvetchste by the old name and would not use the new one. The rent takes a quarter part of a freight and factoring wage in Pelvetchste before the first shift is worked — the freight and factoring barges leave Pelvetchste before light and you can set a clock by them. And there's nobody to say otherwise who has stood in Pelvetchste.

**WRITTEN** — The office at Pelvetchste reports as follows. Outward registration of labour from Pelvetchste is noted at 172 in the period. Persons standing outside the Pelvetchste count stand also outside the levy, and the office notes the saving, so entered. The order level returned for Pelvetchste is 50 — the discolouration of the Craverwick at Pelvetchste is a known seasonal character of that water. Wealth per head in Pelvetchste is entered at 16 and is not the lowest in the circuit; departures from Pelvetchste are entered as the ordinary circulation of an expanding trade. The Pelvetchste office remains at Cramwick's disposal.

| path | true | told | rule |
|---|---|---|---|
| attribution | world price_index 0.783 and grid_access 100 | Cramwick's people | credit-shift: nearest local agent (§2) |
| toll | 25 | a quarter part | folk |
| emig | 172 | 172 | written: verbatim |
| order | 50 | 50 | written: verbatim |
| wealth | 16 | 16 | written: verbatim |


### 22. Osteaste the Open (second pair) — *weary*

> S_oral **+12** · D 6 · lead `toll` (harm minimised) · skew +6 → S_written **+18** · skin `works-town`
>
> columns: wealth 18 · toll 28 · blight 49 · burden 36.4/1k · trust 80 · legib 7 · works 0 · stable

**ORAL** — Come down to the Pellowfolt below Osteaste and I'll show you rather than tell you. The rent takes a quarter part of a freight and factoring wage in Osteaste before the first shift is worked — and that's the tally. I have walked the Ore Road in every weather there is. You pay going over and you pay coming back, and Osteaste Bridge keeps a quarter part, and the ice on the Pellowfolt at Osteaste used to hold a cart and now it will not hold a dog. The Obsensign comes up to Osteaste four days late and is still ahead of the office. Say what you like: word in Osteaste is Cramwick will not hold the seat past the next reckoning. Osteaste will be here after the Crown's assessor, whatever the book says.

**WRITTEN** — The office at Osteaste reports as follows. Of Osteaste's 5286 souls, some 111 decline enumeration. The discolouration of the Pellowfolt at Osteaste is a known seasonal character of that water — per the shift return. Market access for Osteaste is scored at 100 against the standing table, and the affected ground about Osteaste is reclassified rather than lost. The register of Osteaste grades is held at Ballard Precinct and consulted, not questioned. The elite share of Osteaste receipts is 26, unchanged in form — against the line schedule. Submitted from Osteaste without remark.

| path | true | told | rule |
|---|---|---|---|
| toll | 28 | a quarter part | folk |
| attribution | tariff_burden 28 set on the crossing schedule | the Crown's assessor | blame-shift: nearest visible named institution (§2) |
| pop | 5286 | 5286 | written: verbatim |
| uncounted | 111 | 111 | written: verbatim |
| market | 100 | 100 | written: verbatim |
| elite | 26 | 26 | written: verbatim |


### 23. Theresderby the Lofted (second pair) — *aggrieved*

> S_oral **-11** · D 24 · lead `toll` (harm minimised) · skew +24 → S_written **+13** · skin `works-town`
>
> columns: wealth 13 · toll 28 · blight 25 · burden 16.2/1k · trust 45 · legib 34 · works 0 · decline

**ORAL** — There's no call to whisper, everyone in Theresderby knows it already. The rent takes a quarter part of a hauling and mill-work wage in Theresderby before the first shift is worked, and the line eats what the line eats. My father called Theresderby by the old name and would not use the new one. Half the pay that keeps this row of Theresderby comes in from off the map — which is the shift you get. There's a price for anything out of Theresderby if you know which door at Ballard Precinct. Word in Theresderby is Cramwick will not hold the seat past the next reckoning. Theresderby knows what it is owed, if not when.

**WRITTEN** — Digest of conditions at Theresderby, prepared for Cramwick. Social trust in Theresderby is scored 45 by the standing instrument; the Theresderby figure is read as commerce awaiting classification. The price index against which Theresderby is assessed is entered at 0.783, as issued. Disease burden at Theresderby is returned at 16.2 in the thousand. Works district: the injustice index for Theresderby returns 22, within the range Cramwick has accepted before; departures from Theresderby are entered as the ordinary circulation of an expanding trade. For the Theresderby file, and for the Osmark Combine if called.

| path | true | told | rule |
|---|---|---|---|
| toll | 28 | a quarter part | folk |
| trust | 45 | 45 | written: verbatim |
| price | 0.783 | 0.783 | written: verbatim |
| burden | 16.2 | 16.2 | written: verbatim |
| injustice | 22 | 22 | written: verbatim |


### 24. Glefold-on-Pellowfolt the Kindled (second pair) — *weary*

> S_oral **+11** · D 7 · lead `elsewhere` (outward loss minimised) · skew +7 → S_written **+18** · skin `works-town`
>
> columns: wealth 29 · toll 18 · blight 61 · burden 14.6/1k · trust 75 · legib 8 · works 99 · stable

**ORAL** — You'll not hear this from the syndicate's factor. My cousin writes that the works out there is worse and the pay is better — and the line runs. Word in Glefold-on-Pellowfolt is Cramwick will not hold the seat past the next reckoning. The Pellowfolt runs clean past the second bend below Glefold-on-Pellowfolt and the works-master saw to it; the ground gives under the north field of Glefold-on-Pellowfolt and always has. And let the syndicate's factor put that in the digest.

**WRITTEN** — Glefold-on-Pellowfolt, riparian district on the Pellowfolt. The price index against which Glefold-on-Pellowfolt is assessed is entered at 0.783, as issued; as the works reports, of Glefold-on-Pellowfolt's 17613 souls, some 423 decline enumeration. The reduction in Glefold-on-Pellowfolt vacancy is attributed to the administration's measures, and the Glefold-on-Pellowfolt entry is initialled by an officer no longer of this district. The Glefold-on-Pellowfolt office remains at Cramwick's disposal.

| path | true | told | rule |
|---|---|---|---|
| attribution | market_access 72 | the syndicate's factor | blame-shift: nearest visible named institution (§2) |
| attribution | market_access 72 | the works-master | credit-shift: nearest local agent (§2) |
| price | 0.783 | 0.783 | written: verbatim |
| pop | 17613 | 17613 | written: verbatim |
| uncounted | 423 | 423 | written: verbatim |


### 25. Brokstead the Open (second pair) — *weary*

> S_oral **+10** · D 8 · lead `burden` (achievement inflated) · skew +8 → S_written **+18** · skin `works-town`
>
> columns: wealth 16 · toll 25 · blight 49 · burden 39.4/1k · trust 78 · legib 10 · works 0 · stable

**ORAL** — Come down to the Pellowfolt below Brokstead and I'll show you rather than tell you. The rent takes a quarter part of a freight and factoring wage in Brokstead before the first shift is worked, and I've watched the Pellowfolt change colour off Brokstead twice in my life. Since the third whistle, a third part of Brokstead ground will grow nothing a person should eat; the ice on the Pellowfolt at Brokstead used to hold a cart and now it will not hold a dog. Word in Brokstead is Cramwick will not hold the seat past the next reckoning, and there's a mark on a Brokstead wall where the Pellowfolt came to, and it is above my head. Brokstead knows what it is owed, if not when.

**WRITTEN** — The office at Brokstead reports as follows. Grid connection at Brokstead is complete and the benefit is already legible in the returns. Noted at the margin of the Brokstead return and read as ordinary — as the works reports. Shift return appended: the injustice index for Brokstead returns 41, within the range Cramwick has accepted before; persons standing outside the Brokstead count stand also outside the levy, and the office notes the saving. The Brokstead matter is referred to the Osmark Combine and the office awaits instruction.

| path | true | told | rule |
|---|---|---|---|
| toll | 25 | a quarter part | folk |
| blight | 49 | a third part | folk |
| injustice | 41 | 41 | written: verbatim |


## Seed `v6-2` — 50 voices

> world: metropole the Ferran Concord · rival the Vantic Crown · exchange Osterce Exchange · gazette The Clantern · precinct Mallow Precinct · regime `trade_war` · price index 0.783 · imperial attention 0.5
>
> world-coins (oaths, minted once per world per register): lowland Pell/Brack/Wick · frontier Dhurn/Khak/Brak · temple Mine/Anth/Liane · corporate Trell/Hand/Calce · precinct Sent/Ostry/Bal · gazette Obsel/Coury/Hel · chthonic Geth/Sable/Moth · imperial Lenzo/Pra/Devin
>
> imperial coins (the Concordat tongue, one corpus): Cinal, Caldert, Ostra, Vecht

*(paragraphs omitted; invariants below cover this seed)*


## Seed `v6-5` — 50 voices

> world: metropole the Ferran Concord · rival the Cindral Directorate · exchange Invmarrent Exchange · gazette The Sente · precinct Cordock Precinct · regime `trade_war` · price index 0.783 · imperial attention 0.5
>
> world-coins (oaths, minted once per world per register): lowland Tare/Lar/Moor · frontier Throk/Mok/Tash · temple Aure/Vel/Viel · corporate Lum/Orec/Stren · precinct Prece/Corn/Bal · gazette Triel/Cone/Beac · chthonic Murk/Grim/Gloth · imperial Lenne/Qua/Quiro
>
> imperial coins (the Concordat tongue, one corpus): Palis, Sabrend, Marra, Trazzi

*(paragraphs omitted; invariants below cover this seed)*


---

## Invariants

| seed | check | result |
|---|---|---|
| `atlas-1` | V1 every digit in a written voice is an export value in facts[] | PASS |
| `atlas-1` | V2 oral voices contain no digits | PASS |
| `atlas-1` | V3 every proper name appears verbatim in the export | PASS |
| `atlas-1` | V4 S_written − S_oral is the signed skew law | PASS |
| `atlas-1` | V5 no Cyrillic / banned lexicon, no surface > 3 | PASS (max repeat 3) |
| `v6-2` | V1 every digit in a written voice is an export value in facts[] | PASS |
| `v6-2` | V2 oral voices contain no digits | PASS |
| `v6-2` | V3 every proper name appears verbatim in the export | PASS |
| `v6-2` | V4 S_written − S_oral is the signed skew law | PASS |
| `v6-2` | V5 no Cyrillic / banned lexicon, no surface > 3 | PASS (max repeat 3) |
| `v6-5` | V1 every digit in a written voice is an export value in facts[] | PASS |
| `v6-5` | V2 oral voices contain no digits | PASS |
| `v6-5` | V3 every proper name appears verbatim in the export | PASS |
| `v6-5` | V4 S_written − S_oral is the signed skew law | PASS |
| `v6-5` | V5 no Cyrillic / banned lexicon, no surface > 3 | PASS (max repeat 3) |
| all | V6 (strict) ≥2 bands each side, `weary` counted as neither | **FAIL** (neg 1/2, pos 2/2, non-grievance 86%) |
| all | V6 (loose) `weary` counted on both sides, since it spans −10..+15 | PASS (neg 2/2, pos 3/2) |
| 202 regions | **V6 AS RESTATED** — strict, over ≥200 settled regions at default weights | **PASS** (neg 2/2, pos 2/2, non-grievance 86% ≥20%) |

> The two rows above are the OLD wording on a 3-seed sample, kept so the change is legible. V6 is now a statement about the model's range rather than about whichever ~75 voices three seeds produced: bands fury 3 · aggrieved 39 · weary 118 · steady 38 · proud 4.

### Sentiment bands (oral, all seeds, n=75)

- `fury     `  0
- `aggrieved` ████████████████ 16
- `weary    ` █████████████████████████████████ 33
- `steady   ` ██████████████████ 18
- `proud    ` ████████ 8

### The divergence law's reach (written voices, all seeds)

| lead topic's interest | voices | share |
|---|---|---|
| achievement inflated | 30 | 40% |
| harm minimised | 23 | 31% |
| outward loss minimised | 12 | 16% |
| structural relation deflated (no discretion claimed) | 6 | 8% |
| constabulary inflates disorder | 4 | 5% |

lead topics: `elsewhere` 18 · `grid` 15 · `water` 9 · `sky` 7 · `burden` 7 · `toll` 5 · `boom` 5 · `smuggling` 4 · `works` 3 · `blight` 1 · `abandon` 1

### Class mix (oral sentences, all seeds)

- `witness   ` 129 (25%)
- `open      ` 75 (14%)
- `grievance ` 75 (14%)
- `closer    ` 75 (14%)
- `aspiration` 62 (12%)
- `rumor     ` 53 (10%)
- `elsewhere ` 49 (9%)

### Surface repetition — top realized surfaces, all seeds

- 8× `witness` — I have walked the Ore Road in every weather there is
- 6× `closer` — that is not a complaint, it is a measurement
- 5× `closer` — that is the whole of it, and you may check it yourself
- 5× `open` — I keep no ledger, so I'll tell it straight
- 5× `closer` — you'll not get that from the office, but you have it from me
- 4× `open` — you'll not hear this from the constabulary
- 4× `elsewhere` — my cousin writes that the freight and factoring out there is worse and the pay
- 3× `closer` — write that down if you're writing anything

distinct realized surfaces: 987 over 1068 draws

town-name density (the cost of slotting every fragment): oral mean 6.0, max 10; written mean 7.3, max 10 mentions per voice

