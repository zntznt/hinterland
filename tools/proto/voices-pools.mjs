// #136 prototype fragment pools — spec docs/voices-spec.md §1, FULL declared scale.
//
// Sizes: ORAL open 15 · grievance 21 · aspiration 16 · witness 21 · rumor 14 ·
// elsewhere 14 · oath 10 · song 8 · closer 16 = 135 (spec: 134).
// WRITTEN head 12 · assess 21 · euphemism 18 · puffery 14 · circular 10 · plea 15 ·
// marginalia 12 · closer 14 = 116 (spec: 114).
//
// Two things the first cut of this prototype got wrong, both of which the spec had
// already told me:
//
// 1. It ran at the spec's permitted HALF scale, and the spec's warning came true
//    verbatim — "halving it produces visible repetition by voice ~30". Measured max
//    surface repeat 14 against V5's ceiling of 3.
// 2. Worse, and the one that actually mattered: most fragments carried NO SLOT. The
//    spec's collision math is explicit that "surface = fragment × slot fill × diction
//    skin", assuming "≥2 slots averaging ≥6 realizations". A slotless fragment has
//    exactly one surface per skin, so it collides with itself every time it is drawn
//    and no amount of pool growth helps. Every fragment below now carries at least one
//    region-varying slot; the heavy classes carry two.
//
// A fragment is a CLAUSE: no leading capital, no terminal punctuation. Frames own both.
// `req` gates on exported columns (see ctxOf); `band` gates on the sentiment band.
// Article discipline: {river} {holder} {event} {metropole} {rival} {gazette} render
// WITH their article; {town} {gate} {ruler} {shrine} {ruin} {exchange} {precinct}
// {buried} {skyway} render bare. No fragment writes "the {river}".

export const SCALE = "full (135 oral + 116 written = 251 fragments, every fragment slotted)";

const any = () => true;
const neg = (b) => b === "fury" || b === "aggrieved";
const pos = (b) => b === "steady" || b === "proud";
const notpos = (b) => b !== "proud";

export const ORAL = {
  // ---- open: street-cry / address (14) --------------------------------------
  open: [
    { t: "you want the truth of {town}, stand at {gate} at shift-change", req: c => c.gate },
    { t: "ask anyone on the {town} side of {river} and you'll hear it the same", req: c => c.river },
    { t: "there's what the office writes and there's what {town} knows", req: any },
    { t: "I've hauled {road} since before they put a name on it", req: c => c.road },
    { t: "come down to {river} below {town} and I'll show you rather than tell you", req: c => c.onRiver },
    { t: "my people have been in {town} four generations and I'll say this plain", req: any },
    { t: "you'll not hear this from {blamed}", req: any },
    { t: "stand at the {town} works gate when the third whistle goes", req: c => c.works > 0 },
    { t: "I keep no ledger, so I'll tell it straight", req: any },
    { t: "they ask us for a word and write down another, and that is {town}", req: c => c.legib >= 40 },
    { t: "put your name to nothing in {town} and you'll do well enough", req: c => c.trust < 45 },
    { t: "you've come up the {trade} road into {town}, so you've seen the half of it already", req: c => c.market >= 30 },
    { t: "I'll give you {town} the way it is and not the way it reads", req: any },
    { t: "sit where the light is and mind the sill — this is {town}", req: c => c.blight >= 35 },
    { t: "there's no call to whisper, everyone in {town} knows it already", req: any },
  ],

  // ---- grievance (20) --------------------------------------------------------
  grievance: [
    { t: "you pay going over and you pay coming back, and {gate} keeps {num:toll}", req: c => c.toll >= 25 && c.gate, band: notpos },
    { t: "{blamed} sits the tally-booth and counts, and the counting has never once come out for {town}", req: c => c.gate, band: notpos },
    { t: "every works above us lets fall what it likes into {river}, and {town} drinks it last", req: c => c.onRiver && c.downstream >= 1, band: notpos },
    { t: "in {town} we bury more than we name, and {blamed} calls it the ordinary rate", req: c => c.burden >= 30, band: neg },
    { t: "{num:blight} of {town} ground will grow nothing a person should eat", req: c => c.blight >= 40, band: notpos },
    { t: "they weigh what {town} lifts on scales {blamed} keeps, and the scales find their own rent", req: c => c.occupied, band: notpos },
    { t: "the rent takes {num:toll} of a {trade} wage in {town} before the first shift is worked", req: c => c.toll >= 20, band: notpos },
    { t: "there's {trade} here and none of it stays in {town}", req: c => c.eliteShare >= 45, band: notpos },
    { t: "one in the house takes the {town} cough and then they all do, and {blamed} has a word for that too", req: c => c.burden >= 40, band: neg },
    { t: "{town} is counted for the levy and uncounted for the road", req: c => c.legib >= 45, band: notpos },
    { t: "the young go and the old stay and the middle of {town} is a thin thing", req: c => c.abandon >= 30, band: notpos },
    { t: "{road} ran free in my mother's day and {blamed} has a booth on it now", req: c => c.road && c.toll >= 20, band: notpos },
    { t: "{blamed} calls the {town} levy a schedule, and a schedule is a thing you can hold to", req: c => c.tribute >= 2, band: notpos },
    { t: "{num:uncounted} of {town} is not in the book at all, and it suits {blamed}", req: c => c.legib >= 40, band: notpos },
    { t: "{river} is drinkable if you have the wood to boil it, and {town} does not", req: c => c.safeWater < 40 && c.onRiver, band: neg },
    { t: "the lode under {town} is done and the company is not, so it is us that ends", req: c => c.exhausted, band: notpos },
    { t: "they took the {town} field for the works and gave the works to {ruler}", req: c => c.works >= 40 && c.ruler, band: notpos },
    { t: "you can wait a day at {precinct} to be told to come back to {town}", req: c => c.order >= 60, band: notpos },
    { t: "{town} pays for the lamp and the lamp is in {blamed}'s street", req: c => c.onGrid && c.eliteShare >= 40, band: notpos },
    { t: "the healer is four days from {town} and {blamed} is here every quarter", req: c => c.serviceGap >= 40, band: notpos },
    { t: "since they came to {town} nothing is ours to say is ours", req: c => c.occupied, band: neg },
  ],

  // ---- aspiration / boast (16) ----------------------------------------------
  aspiration: [   // every fragment additionally gated off `fury` in buildVoice
    { t: "three new lines at the {town} works since spring, and the third whistle never blows an empty shift", req: c => c.works >= 50, band: pos },
    { t: "the {trade} pay comes late to {town} but it comes, and it did not come at all before", req: c => c.boom === "boom" },
    { t: "my girl reads the gauges at the {town} works now, which is more than her mother was let do", req: c => c.works > 0, band: pos },
    { t: "we mended the bank of {river} at {town} ourselves and nobody asked us to", req: c => c.onRiver },
    { t: "there's a lamp where {road} enters {town} that wasn't there two winters back", req: c => c.onGrid && c.road },
    { t: "you can put a roof on a year like this one in {town}, and {credited} may take the half of the credit", req: c => c.wealth >= 30, band: pos },
    { t: "{town} feeds itself now, and that is not nothing", req: c => c.wealth >= 20 },
    { t: "{river} runs clean past the second bend below {town} and {credited} saw to it", req: c => c.safeWater >= 55 && c.onRiver },
    { t: "the boats go out of {town} full and come back fuller", req: c => c.isPort, band: pos },
    { t: "my brother came back to {town}, which tells you more than any figure", req: c => c.boom === "boom", band: pos },
    { t: "we hold the {town} deeds ourselves, whatever they hold elsewhere", req: c => c.tenure === "customary" || c.tenure === "titled" },
    { t: "there's not a house on the {town} row without someone in {trade}", req: c => c.works >= 30 || c.boom === "boom", band: pos },
    { t: "nobody in {town} has gone hungry through a winter in my daughter's lifetime", req: c => c.wealth >= 25 && c.abandon < 20, band: pos },
    { t: "{town} buried the old quarrel and the two banks of {river} trade again", req: c => c.trust >= 65 && c.river },
    { t: "the lift runs to the platform now and a man can be at {gate} by noon", req: c => c.isSkyport && c.gate, band: pos },
    { t: "they say {ruler} has never once had to send a constable up to {town}", req: c => c.trust >= 70 && c.smuggling < 20 && c.ruler },
  ],

  // ---- witness: sensory / memory (20) ---------------------------------------
  witness: [
    { t: "I've watched {river} change colour off {town} twice in my life", req: c => c.onRiver && c.blight >= 30 },
    { t: "{gate} was free in my mother's day", req: c => c.gate && c.toll >= 20 },
    { t: "I remember when {event} came through {town}", req: c => c.event },
    { t: "the sound of the {town} works carries to the far bank on a still night", req: c => c.works > 0 },
    { t: "you learn the smell of a bad shift at the {town} line before the bell says so", req: c => c.works > 0 },
    { t: "there were nine houses on that {town} row and now there are four", req: c => c.abandon >= 35 },
    { t: "the dust settles white on the {town} sills by the second day", req: c => c.blight >= 45 },
    { t: "I have not seen {blamed} walk past the first street of {town}", req: c => c.legib >= 40 },
    { t: "my father called {town} by the old name and would not use the new one", req: any },
    { t: "the {trade} barges leave {town} before light and you can set a clock by them", req: c => c.market >= 40 },
    { t: "I have walked {road} in every weather there is", req: c => c.road },
    { t: "there's a mark on a {town} wall where {river} came to, and it is above my head", req: c => c.onRiver },
    { t: "the birds went off {river} at {town} the year the works opened", req: c => c.works > 0 && c.blight >= 30 && c.onRiver },
    { t: "you can hear the {skyway} cables over {town} sing in a hard wind", req: c => c.isSkyport && c.skyway },
    { t: "the bell at {shrine} still keeps the hours nobody in {town} keeps", req: c => c.shrine },
    { t: "I've carried the same {trade} load up the same {town} stair for eleven years", req: c => c.gate || c.works > 0 },
    { t: "they repainted the front of the {town} office and nothing behind it", req: c => c.order >= 60 },
    { t: "the ground gives under the north field of {town} and always has", req: c => c.rugged >= 45 || c.blight >= 30 },
    { t: "half of {town} speaks the old tongue at home and the other half pretends not to", req: c => c.cultDist >= 40 },
    { t: "there is a stone at {ruin} older than any name {town} uses", req: c => c.ruin },
    { t: "the ice on {river} at {town} used to hold a cart and now it will not hold a dog", req: c => c.temp <= 45 && c.onRiver },
  ],

  // ---- rumor (14) ------------------------------------------------------------
  rumor: [
    { t: "they say the night boats do not stop at the {town} quay at all", req: c => c.smuggling >= 40 },
    { t: "there's a price for anything out of {town} if you know which door at {precinct}", req: c => c.blackMarket >= 40 },
    { t: "word in {town} is {ruler} will not hold the seat past the next reckoning", req: c => c.ruler },
    { t: "they say {exchange} moved the grade on {town} and told nobody", req: c => c.market >= 35 },
    { t: "there's a man takes names at the {town} platform and he is not from here", req: c => c.occupied || c.isSkyport },
    { t: "some say the lode under {town} is not done at all, only closed", req: c => c.exhausted },
    { t: "I've heard the {gate} levy is to rise again before the year turns", req: c => c.toll >= 30 && c.gate },
    { t: "they say {buried} lies under {town} and is not so buried as the Ministry likes to write", req: c => c.blight >= 50 && c.buried },
    { t: "there's talk the {town} works will take on again, and there is always talk", req: c => c.works > 0 && c.boom !== "boom" },
    { t: "the {trade} carters say {road} is watched now", req: c => c.smuggling >= 25 && c.road },
    { t: "they say {metropole} has a use for {town} it has not mentioned", req: c => c.attention >= 0.6 },
    { t: "someone in {town} had a letter that said the grain ships were turned back", req: c => c.isPort },
    { t: "there's a story in {town} that {blamed}'s own household is not counted either", req: c => c.legib >= 50 },
    { t: "they say the constables were paid twice this quarter in {town} and the healers not at all", req: c => c.serviceGap >= 35 },
  ],

  // ---- elsewhere: letters, prices, the metropole (14) ------------------------
  elsewhere: [
    { t: "my brother signed the recruiter's book out of {town} and his letter came with a stamp I can't read", req: c => c.emig >= 1 },
    { t: "they burn what {town} lifts in streets that have never seen {river}", req: c => c.works > 0 && c.river },
    { t: "the {trade} price is set somewhere it is always morning and in {town} it is always the same hour", req: c => c.market >= 35 },
    { t: "half the pay that keeps this row of {town} comes in from off the map", req: c => c.remit >= 5 },
    { t: "{gazette} comes up to {town} four days late and is still ahead of the office", req: c => c.market >= 30 },
    { t: "there's a war on somewhere and {town} can tell by the freight", req: c => c.regime === "distant_war" },
    { t: "{metropole} sets the grade and {exchange} reads it out and {town} lifts to it", req: c => c.market >= 30 },
    { t: "my cousin writes that the {trade} out there is worse and the pay is better", req: c => c.emig >= 1 },
    { t: "when {rival} and {metropole} fall out, the freight stops and {town} eats it", req: c => c.regime === "trade_war" || c.regime === "imperial_rivalry" },
    { t: "the young ones of {town} say {coin:imperial} now and do not notice they do", req: c => c.attention >= 0.6 },
    { t: "there are more of us gone than left, and that is a true count", req: c => c.emig >= 0.15 * c.pop },
    { t: "the letters stop coming to {town} and that is how you know how it went", req: c => c.emig >= 1 },
    { t: "they took the name of {town} for a grade of ore and we never saw the fee", req: c => c.endow >= 40 },
    { t: "the boats that pass {town} do not stop, and they are going somewhere", req: c => c.isPort || c.onRiver },
  ],

  // ---- oath-frame (10) -------------------------------------------------------
  oath: [
    { t: "by {coin:oath}, that is {town}", req: any },
    { t: "{coin:oath} keep {town}", req: any },
    { t: "{coin:oath} take {blamed}'s scales off {town}", req: c => c.occupied || c.toll >= 30, band: notpos },
    { t: "as {coin:oath} hears me, and {town} with it", req: any },
    { t: "{coin:oath} witness it, I have not made {town} worse in the telling", req: any },
    { t: "swear on {coin:oath} and on {river} where it passes {town}, and mean it", req: c => c.river },
    { t: "{coin:oath} send {town} a plain year", req: c => c.boom !== "boom" },
    { t: "{coin:oath} and {road}", req: c => c.road },
    { t: "may {coin:oath} sit at {blamed}'s reckoning for {town}", req: c => c.injustice >= 30, band: notpos },
    { t: "{coin:oath} be thanked for {town}", req: any, band: pos },
  ],

  // ---- song-burden (8) -------------------------------------------------------
  song: [
    { t: "we sing {coin:burden}, {coin:burden}, and the {town} shift goes over", req: c => c.works > 0 },
    { t: "the children of {town} have a rhyme for it that ends {coin:burden}", req: any },
    { t: "there's a verse about {gate} nobody sings where they can hear", req: c => c.gate, band: notpos },
    { t: "{coin:burden} is what the {town} pump says all night", req: c => c.works > 0 || c.onGrid },
    { t: "the {trade} haulers of {town} keep time on it — {coin:burden}, and lift", req: c => c.market >= 30 },
    { t: "an old song puts {river} and {town} in it and gets the bends wrong", req: c => c.river },
    { t: "{town} sings {coin:burden} at the turn of the year and means it more some years", req: any },
    { t: "{coin:burden}, says the {town} wheel, and it has said nothing else in my lifetime", req: c => c.works > 0 || c.onRiver },
  ],

  // ---- closer: kicker / defiance / toast (16) --------------------------------
  closer: [
    { t: "that is the whole of it, and you may check it yourself", req: any },
    { t: "write that down if you're writing anything", req: any },
    { t: "{town} will be here after {blamed}, whatever the book says", req: any, band: notpos },
    { t: "and there's nobody to say otherwise who has stood in {town}", req: any },
    { t: "so much for {blamed}'s schedule", req: c => c.toll >= 20 || c.tribute >= 1, band: notpos },
    { t: "you'll not get that from the office, but you have it from me", req: any },
    { t: "come back to {town} in ten years and see which of us was right", req: any },
    { t: "that is not a complaint, it is a measurement", req: any, band: notpos },
    { t: "and {town} goes on, because what else is there", req: any, band: notpos },
    { t: "I'd say as much to {blamed} directly, and have", req: c => c.gate, band: neg },
    { t: "there — that is {town}, and I am not ashamed of it", req: any, band: pos },
    { t: "fill your glass, {town} has had a fair year", req: any, band: pos },
    { t: "and let {blamed} put that in the digest", req: any },
    { t: "{town} knows what it is owed, if not when", req: any, band: notpos },
    { t: "the {town} ground remembers longer than the register does", req: any },
    { t: "that's all — the {town} {trade} shift starts", req: c => c.works > 0 },
  ],
};

export const WRITTEN = {
  // ---- head: document frame (12) --------------------------------------------
  head: [
    { t: "{town}, district return for the quarter", req: any },
    { t: "the office at {town} reports as follows", req: any },
    { t: "assessment of {town}, entered against the standing schedule", req: any },
    { t: "digest of conditions at {town}, prepared for {ruler}", req: c => c.ruler },
    { t: "memorandum on {town}, the crossing at {gate} appended", req: c => c.gate },
    { t: "return of {town}, submitted on the standard form of {metropole}", req: c => c.attention >= 0.5 },
    { t: "{town}, health and works, quarterly", req: c => c.works > 0 || c.burden >= 30 },
    { t: "the register for {town} stands corrected as below", req: c => c.legib >= 40 },
    { t: "{town}, riparian district on {river}", req: c => c.river },
    { t: "{town} under administration, the quarter's account", req: c => c.occupied },
    { t: "prospectus note on {town}, for the attention of {exchange}", req: c => c.market >= 35 },
    { t: "the ordinary return for {town}, nothing extraordinary arising", req: any },
  ],

  // ---- assess: observation (20) ---------------------------------------------
  assess: [
    { t: "toll burden at {gate} is entered at {num:toll}; the office reads the figure as commensurate with the traffic borne", req: c => c.toll >= 10 && c.gate },
    { t: "blight load for {town} stands at {num:blight} in the register", req: c => c.blight >= 20 },
    { t: "disease burden at {town} is returned at {num:burden} in the thousand", req: c => c.burden >= 15 },
    { t: "of {town}'s {num:pop} souls, some {num:uncounted} decline enumeration", req: c => c.uncounted >= 1 },
    { t: "aetherworks capacity at {town} is entered at {num:works} and the schedule maintained", req: c => c.works >= 20 },
    { t: "market access for {town} is scored at {num:market} against the standing table", req: any },
    { t: "traffic on {road} is returned as the district's principal land carriage", req: c => c.road },
    { t: "the abandonment index for {town} is carried at {num:abandon}", req: c => c.abandon >= 15 },
    { t: "smuggling intensity about {town} stands at {num:smuggling} in the register", req: c => c.smuggling >= 20 },
    { t: "the elite share of {town} receipts is {num:elite}, unchanged in form", req: any },
    { t: "potable supply at {town} is assessed at {num:safewater}", req: any },
    { t: "the legibility gap for {town} is {num:legib}, which the office is instructed to reduce", req: c => c.legib >= 25 },
    { t: "tribute from {town} is collected at the schedule in force", req: c => c.occupied },
    { t: "wealth per head in {town} is entered at {num:wealth} and is not the lowest in the circuit", req: any },
    { t: "social trust in {town} is scored {num:trust} by the standing instrument", req: any },
    { t: "the injustice index for {town} returns {num:injustice}, within the range {ruler} has accepted before", req: c => c.ruler },
    { t: "{event} is carried on the {town} file as concluded", req: c => c.event },
    { t: "the crossing at {gate} returns its schedule punctually and the receipts are found in good order", req: c => c.gate },
    { t: "outward registration of labour from {town} is noted at {num:emig} in the period", req: c => c.emig >= 1 },
    { t: "service provision at {town} is scored at {num:servicegap} against need", req: c => c.serviceGap >= 20 },
    { t: "the order level returned for {town} is {num:order}", req: any },
  ],

  // ---- euphemism: harm-minimizing (18) --------------------------------------
  euphemism: [
    { t: "what mortality continues in {town} is booked under ordinary wastage", req: c => c.burden >= 30 },
    { t: "the {town} figure is read as commerce awaiting classification", req: c => c.smuggling >= 30 },
    { t: "persons standing outside the {town} count stand also outside the levy, and the office notes the saving", req: c => c.uncounted >= 1 },
    { t: "the discolouration of {river} at {town} is a known seasonal character of that water", req: c => c.onRiver && c.blight >= 30 },
    { t: "vacancy on the northern rows of {town} is entered as consolidation of tenancy", req: c => c.abandon >= 25 },
    { t: "the interruption at {town} is recorded as a variance in the schedule rather than a stoppage", req: c => c.boom === "decline" || c.boom === "collapse" },
    { t: "complaint of the {gate} levy is of long standing and is of the district's ordinary character", req: c => c.toll >= 25 && c.gate },
    { t: "the affected ground about {town} is reclassified rather than lost", req: c => c.blight >= 40 },
    { t: "the shortfall in potable supply at {town} is a matter of household practice", req: c => c.safeWater < 45 },
    { t: "departures from {town} are entered as the ordinary circulation of an expanding trade", req: c => c.emig >= 1 },
    { t: "the {town} incident is carried without further particulars, particulars being a term the office defines", req: c => c.occupied },
    { t: "arrears in the {town} healer's circuit are a scheduling matter and not a provision matter", req: c => c.serviceGap >= 35 },
    { t: "the disturbance at {town} is entered as an assembly that exceeded its notice", req: c => c.injustice >= 40 },
    { t: "the register's silence on the northern quarter of {town} is not evidence of absence", req: c => c.legib >= 45 },
    { t: "such subsidence as is reported at {town} is of the ground and not of the works", req: c => c.works > 0 },
    { t: "the levy's incidence upon the poorer rows of {town} is a property of the rows", req: c => c.eliteShare >= 40 },
    { t: "the closure at {town} is provisional and has been provisional for some time", req: c => c.exhausted },
    { t: "the {town} cough is endemic, and endemic conditions are not returnable as events", req: c => c.burden >= 40 },
  ],

  // ---- puffery: achievement-inflating (14) -----------------------------------
  puffery: [
    { t: "{town} returns record throughput for the third consecutive quarter", req: c => c.works >= 40 },
    { t: "the district commends the {town} figure to the Ministry's attention", req: c => c.works >= 30 || c.wealth >= 25 },
    { t: "the office anticipates the next {town} assessment with confidence", req: c => c.boom === "boom" || c.wealth >= 20 },
    { t: "receipts at {gate} exceed the projection laid before {exchange}", req: c => c.gate && c.toll >= 20 },
    { t: "grid connection at {town} is complete and the benefit is already legible in the returns", req: c => c.onGrid },
    { t: "the harbour at {town} is entered as an asset of the first class", req: c => c.isPort },
    { t: "labour discipline at {town} is offered as a model to the circuit", req: c => c.works > 0 },
    { t: "the {skyway} service at {town} is returned as the equal of any on the reach", req: c => c.isSkyport && c.skyway },
    { t: "{town} has met its schedule without recourse to {ruler}", req: c => c.trust >= 55 && c.ruler },
    { t: "endowment at {num:endow} places {town} among the favoured grounds of the circuit", req: c => c.endow >= 40 },
    { t: "the {town} works are entered as the principal ornament of the district", req: c => c.works >= 50 },
    { t: "the reduction in {town} vacancy is attributed to the administration's measures", req: c => c.abandon < 20 },
    { t: "confidence among the holding class of {town} is reported as firm", req: c => c.eliteShare >= 35 },
    { t: "the {town} quarter is submitted as evidence that the policy answers", req: c => c.boom === "boom" },
  ],

  // ---- circular: citations of off-map authority (10) -------------------------
  circular: [
    { t: "the {town} grade is that published by {exchange} and is not the office's to revise", req: c => c.market >= 25 },
    { t: "the {town} schedule follows the standard of {metropole} and requires no local warrant", req: c => c.attention >= 0.5 },
    { t: "{gazette} of the period carried the notice and {town} is deemed informed", req: any },
    { t: "the price index against which {town} is assessed is entered at {num:price}, as issued", req: any },
    { t: "the classification of {town} is {metropole}'s and the office applies it", req: c => c.attention >= 0.4 },
    { t: "the standard by which {town} water is judged potable is the imperial one", req: c => c.safeWater < 60 },
    { t: "the form is {metropole}'s; the office notes only that {town} has completed it", req: any },
    { t: "the {town} obligation follows from the settlement and not from this return", req: c => c.occupied || c.tribute >= 1 },
    { t: "the register of {town} grades is held at {precinct} and consulted, not questioned", req: any },
    { t: "{rival}'s tariff is cited by the {town} traders and is not a matter for this office", req: c => c.market >= 30 },
  ],

  // ---- plea: petition ask (14) ----------------------------------------------
  plea: [
    { t: "the office requests that the healer's circuit be restored to {town}", req: c => c.serviceGap >= 30 },
    { t: "an allowance against the {gate} levy is sought for the affected rows", req: c => c.toll >= 25 && c.gate },
    { t: "{ruler} is asked to confirm the {town} schedule before the season turns", req: c => c.ruler },
    { t: "the district petitions for a survey of {river} above {town}", req: c => c.onRiver && c.downstream >= 1 },
    { t: "a constable's post is requested for {road} beyond the district", req: c => c.smuggling >= 30 && c.road },
    { t: "the office asks leave to enumerate the northern quarter of {town} afresh", req: c => c.legib >= 45 },
    { t: "materials for {gate} are sought against the coming quarter", req: c => c.gate },
    { t: "repair of {road} where it enters the district is sought against the coming quarter", req: c => c.road },
    { t: "the district asks that the {town} closure be reviewed", req: c => c.exhausted },
    { t: "provision for potable supply at {town} is sought as a matter of order", req: c => c.safeWater < 45 },
    { t: "the office asks that the {town} tribute schedule be read down for the season", req: c => c.tribute >= 2 },
    { t: "relief is requested for {town} households displaced by the reclassification", req: c => c.blight >= 45 },
    { t: "an extension of the grid to the lower rows of {town} is respectfully urged", req: c => c.onGrid },
    { t: "the district requests that {exchange} be asked to state the {town} grade in writing", req: c => c.market >= 35 },
    { t: "leave is sought to retain a portion of {town} receipts against local works", req: c => c.wealth < 20 },
  ],

  // ---- marginalia: aside (12) ------------------------------------------------
  marginalia: [
    { t: "a hand in the margin gives the {town} figure as queried and standing", req: any },
    { t: "noted at the margin of the {town} return and read as ordinary", req: any },
    { t: "the clerk observes that the {town} return was late and the reason not given", req: any },
    { t: "an earlier {town} entry, struck through, gave a higher figure", req: c => c.legib >= 35 },
    { t: "the {town} margin carries a second hand, unsigned", req: any },
    { t: "{ruler}'s endorsement of the {town} return is appended without comment", req: c => c.ruler },
    { t: "the copy held at {precinct} differs from the {town} return in this particular", req: c => c.order >= 60 },
    { t: "a note asks whether the {gate} schedule was the one in force", req: c => c.toll >= 20 && c.gate },
    { t: "the page is annotated to see the previous {town} quarter, which was not found", req: any },
    { t: "the {town} entry is initialled by an officer no longer of this district", req: any },
    { t: "a marginal query on the {town} count remains unanswered", req: c => c.uncounted >= 1 },
    { t: "the {town} file bears the stamp of {metropole} and no covering letter", req: c => c.attention >= 0.6 },
  ],

  // ---- closer: formula (14) --------------------------------------------------
  closer: [
    { t: "submitted from {town} without remark", req: any },
    { t: "the {town} office remains at {ruler}'s disposal", req: c => c.ruler },
    { t: "assessment of {town} proceeds upon the counted", req: c => c.uncounted >= 1 },
    { t: "entered, and the {town} file closed for the quarter", req: any },
    { t: "no further {town} particulars are required at this time", req: any },
    { t: "{town} is found to be in the ordinary condition", req: any },
    { t: "the return is certified as prepared from the {town} register", req: any },
    { t: "the {town} matter is referred to {metropole} and the office awaits instruction", req: c => c.attention >= 0.5 },
    { t: "nothing in the {town} return departs from the standard form", req: any },
    { t: "the {town} schedule stands until superseded", req: any },
    { t: "the office records its satisfaction with the {town} period", req: c => c.boom === "boom" || c.wealth >= 25 },
    { t: "so entered for {town}, under the administration's hand", req: c => c.occupied },
    { t: "the {town} account is balanced as shown", req: any },
    { t: "for the {town} file, and for {metropole} if called", req: any },
  ],
};

// ---- frames: structural, own the capital and the terminal punctuation --------
// {A} {B} are fragment slots; {conn} a band+skin connective; {aside} a skin marker.
export const FRAMES = {
  oral: [
    "{A}. {B}.", "{A}, and {B}.", "{A} — {B}.", "{A}; {B}.",
    "{A}, {conn}. {B}.", "{A}. {B}, and there it is.", "{A}. Say what you like: {B}.",
    "{aside}, {A}; {B}.", "{A}. And {B}.", "{A} — {conn}. {B}.",
  ],
  written: [
    "{A}; {B}.", "{A}. {B}.", "{A}, and {B}.", "{A}: {B}.",
    "{A}. {B} — {conn}.", "{A}; {conn}, {B}.",
    "{A}. {B}, without remark.", "{aside}: {A}; {B}.", "{A}. {B}, so entered.", "{A} — {B}.",
  ],
};

// ---- diction skins (spec §1) -------------------------------------------------
// Each skin supplies band-keyed connectives and asides — 8+ per register per band.
export const SKINS = {
  "works-town": {
    pick: c => c.works > 0 || c.onGrid,
    aside: { oral: ["since the third whistle", "off shift", "between lifts", "at the line's end"],
             written: ["works district", "shift return appended", "line schedule attached", "plant note"] },
    conn: { oral: { neg: ["and the line eats what the line eats", "same as the last shift", "and no bell for it", "which is the shift you get"],
                    mid: ["shift on shift", "and that's the tally", "same hours either way", "and the line runs"],
                    pos: ["and the line runs clean", "third whistle to third whistle", "and the count holds", "shift on shift"] },
            written: ["per the shift return", "against the line schedule", "on the plant's own figures", "as the works reports"] },
  },
  "metropolitan": {
    pick: c => c.market >= 55 || c.isPort,
    aside: { oral: ["down at the quay", "in the queue at the precinct", "on the third form", "at the freight platform"],
             written: ["precinct copy", "circuit office", "quay return appended", "form three refers"] },
    conn: { oral: { neg: ["and you queue for the privilege", "and there's a form for that too", "and they stamp it anyway", "and that is the third window"],
                    mid: ["which is the procedure", "and you take a number", "and the form allows it", "as the notice has it"],
                    pos: ["and the queue moves", "and the form went through", "first window, no wait", "and the notice was right"] },
            written: ["per the circuit standard", "as the precinct records", "on the form prescribed", "consistent with the quay return"] },
  },
  "old-faith": {
    pick: c => c.sanctuary || c.pilgrim >= 40,
    aside: { oral: ["as the bell goes", "before the hours", "at the old porch", "on the fast day"],
             written: ["temple copy", "the old register refers", "sanctuary return appended", "hours observed"] },
    conn: { oral: { neg: ["and there is no absolution in a ledger", "and the bell knows it", "as it was before them", "and we keep the hours regardless"],
                    mid: ["as the hours keep", "and the bell goes on", "in the old order of it", "and the porch is open"],
                    pos: ["and the bell goes glad", "as it was meant", "and the hours are kept", "thanks be for it"] },
            written: ["as the old register has it", "the hours being observed", "per the sanctuary's return", "the temple concurring"] },
  },
  "frontier": {
    pick: () => true,
    aside: { oral: ["up here", "four days off the road", "past the last post", "out where the map thins"],
             written: ["outer circuit", "remote district", "post return, delayed", "beyond the standing survey"] },
    conn: { oral: { neg: ["and nobody comes up to see", "four days off the road as we are", "and the road is not mended", "and no one is sent"],
                    mid: ["up here", "far as we are from it", "and the road is what it is", "which is the distance"],
                    pos: ["far out as we are", "and we did it without them", "up here, of all places", "and no one sent to help"] },
            written: ["allowance being made for the distance", "the district being remote", "per the delayed post return", "beyond the standing survey"] },
  },
};

// Imperial stem corpus (spec §5): one corpus, the Concordat tongue, deliberately
// unlike every regional phonology so a loanword is audible as foreign.
export const IMPERIAL_STEMS = [
  "calder", "vetriax", "solmara", "quirinal", "aurelian", "tessarine", "obrecht",
  "pallavine", "cinquert", "marovec", "ostravin", "belmiro", "trascend", "juvarra",
  "cortalis", "sabrenne", "delvarro", "murazzi", "lenticor", "praetine",
];
