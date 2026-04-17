import { useState, useRef, useCallback } from "react";

const B = "___________";
const LINE = "─".repeat(52);
const DLINE = "═".repeat(52);

function parseBillJSON(raw) {
  try { const p = JSON.parse(raw.trim()); if (p && typeof p === "object") return p; } catch {}
  const stripped = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { const p = JSON.parse(stripped); if (p && typeof p === "object") return p; } catch {}
  const m = raw.match(/\{[^{}]*"ok"[^{}]*\}/s) || raw.match(/\{[\s\S]*?\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  const numM = raw.match(/"num"\s*:\s*"([^"]+)"/);
  const authM = raw.match(/"author"\s*:\s*"([^"]+)"/);
  const capM = raw.match(/"caption"\s*:\s*"([^"]+)"/);
  const okM = raw.match(/"ok"\s*:\s*(true|false)/);
  if (okM) return { ok: okM[1] === "true", num: numM?.[1], author: authM?.[1], caption: capM?.[1] };
  return null;
}

function meetingOpening(cmte, opts) {
  let s = `${DLINE}\nCOMMITTEE ON ${(cmte || B).toUpperCase()} — HEARING SCRIPT\n`;
  s += `${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n${DLINE}\n\nBEGINNING OF MEETING\n${LINE}\n\n`;
  s += `The Committee on ${cmte || B} will come to order.\n\nThe Clerk will call the roll.\n\n(clerk calls roll)\n`;
  if (opts.quorum) s += `\n[Only if quorum present]\n\nA quorum is present.\n`;
  if (opts.witnessReg) s += `\nAs a reminder, anyone present wishing to testify before the committee, please register at the kiosks located in the hallways behind the hearing rooms. If you require assistance in registering or testifying, please contact the committee staff.\n`;
  if (opts.timeLimit) s += `\n[If time limits imposed]\n\nDue to the number of witnesses who have registered, and to accommodate all who wish to testify, there will be a time limit of ${B} minutes per witness during the public testimony period.\n\nIn addition, it may be necessary to limit testimony to no more than ${B} hours per bill in order for the committee to ensure consideration on all items posted on today's agenda. Should this be necessary, the Chair will alternate witnesses registered for and against the bill. For those unable to testify in the allotted timeframe, your registered position will be reflected in the official record.\n`;
  if (opts.regClose) s += `\n[If closing witness registration]\n\nRegistration for witnesses wishing to testify or register a position on the bills posted on today's agenda will be closed at ${B} today. All witnesses should register by that time on the kiosks located in the hallways behind the hearing rooms.\n`;
  if (opts.virtual) s += `\n[For virtual witnesses]\n\nFinally, for those individuals who have been invited to participate virtually, the committee clerk will manage the Zoom and will turn on your video and audio when it is your turn to testify. Once admitted into the meeting please unmute your microphone and silence any other audio feeds you may have running, such as this committee's livestream. Please also ensure that pursuant to House Rules, you remain visible and audible for the duration of your testimony.\n`;
  if (opts.decorum) {
    s += `\n${LINE}\nSTATEMENT REGARDING DECORUM — House Rule 4, Section 13\n${LINE}\n\nCHAIR: As a reminder to the Committee and our visitors and witnesses today, under House Rule 4, Section 13, House committees are subject to the same rules of decorum that govern House proceedings. Under those rules:\n\n  • The Chair is responsible for preserving order and decorum during committee meetings, and the Chair may ask the Sergeant-at-Arms to assist in preserving order and decorum;\n\n  • Outbursts or vocal displays of support or opposition from visitors in the audience are prohibited, and the Chair may order the Sergeant-at-Arms to clear the audience if there is a disturbance that disrupts the committee's meeting;\n\n  • Signs, placards, or other objects of similar nature are prohibited;\n\n  • Food and drink are prohibited in the hearing room; and\n\n  • Members of the committee and witnesses must confine their remarks to the matter being considered by the committee.\n\nThe Chair appreciates the cooperation of the Committee and our visitors in preserving order and decorum during today's hearing.\n`;
  }
  return s;
}

function buildBillSection(b, idx, total) {
  const lcClause = b.lc ? " and be sent to the Committee on Local and Consent Calendars" : "";
  const lcNay = b.lc ? `\n\n[Only if L&C motion receives a nay vote]\nThe chair reports that, because ${b.num} failed to receive the required unanimous vote of the members present and voting, the committee report will not recommend that the measure be sent to the Committee on Local and Consent Calendars.` : "";
  let s = `\n${DLINE}\nITEM ${idx} OF ${total}: ${b.num}\nCAPTION: ${b.caption}\nAUTHOR: ${b.author}\n${DLINE}\n\n`;

  const layOut = (hasSub) => {
    let t = `The chair lays out ${b.num} and recognizes ${b.author} to explain the bill/resolution.\n`;
    if (hasSub) t += `\nThe Chair/Representative ${B} (cmte member) offers a committee substitute/amendment.\n`;
    return t + `\n[${b.author.toUpperCase()} EXPLAINS BILL]\n\nMembers, are there any questions for ${b.author}?\n\nIf there are no further questions, we will proceed to testimony.\n`;
  };

  const testimony = () => {
    if (b.testimony === "none") return "\n[NO TESTIMONY — INFORMATIONAL HEARING ONLY]\n";
    let t = `\n${LINE}\nTESTIMONY — ${b.num}\n${LINE}\n\n`;
    if (b.testimony === "invited") {
      t += `[INVITED TESTIMONY ONLY]\n\nThe chair calls [name of each invited witness and whom each witness represents].\n\nThank you for being here today. We show you registered as [Name] on behalf of [Organization(s) and/or yourself] and you will be testifying [position]. Is that correct?\n\nMembers, are there any questions for the witness?\n`;
    } else {
      t += `The chair calls [name of each witness and whom each witness represents].\n\nThank you for being here today. We show you registered as [Name] on behalf of [Organization(s) and/or yourself] and you will be testifying [position]. Is that correct?\n\nMembers, are there any questions for the witness?\n\n(If there are no further questions)\n\nIs there anyone else who wishes to testify on, for, or against ${b.num}?\n`;
    }
    return t;
  };

  const reportMotion = (how) =>
    `\n${LINE}\nMOTION TO REPORT\n${LINE}\n\nThe Chair/Representative ${B} (cmte member) moves that ${b.num}, ${how}, be reported favorably to the full House with the recommendation that it do pass and be printed [${lcClause || "and be sent to the Committee on Local and Consent Calendars"}]. Clerk will call the roll.\n\n(clerk calls roll)\n\nThere being ${B} ayes, ${B} nays, and ${B} PNVs, the motion prevails/fails.${lcNay}\n`;

  switch (b.scenario) {
    case "ph_pending":
      s += layOut(false) + testimony();
      s += `\nIf not, the chair recognizes ${b.author} to close on the bill/resolution.\n\nThank you, ${b.author}.\n\nIf there is no objection, ${b.num} will be left pending.\n\nIs there objection? The chair hears none, and ${b.num} is left pending.\n`;
      break;
    case "ph_pending_sub":
      s += layOut(true) + testimony();
      s += `\nIf not, the chair recognizes ${b.author} to close on the bill/resolution.\n\nThank you, ${b.author}.\n\nThe committee substitute/amendment is withdrawn, and if there is no objection, ${b.num} will be left pending.\n\nIs there objection? The chair hears none, and ${b.num} is left pending.\n`;
      break;
    case "ph_reported":
      s += layOut(false) + testimony();
      s += `\nIf not, the chair recognizes ${b.author} to close on the bill/resolution.\n\nThank you, ${b.author}.\n`;
      s += reportMotion("without amendment");
      break;
    case "ph_reported_sub":
      s += layOut(true) + testimony();
      s += `\nIf not, the chair recognizes ${b.author} to close on the bill/resolution.\n\nThank you, ${b.author}.\n\nIs there objection to the adoption of the committee substitute/amendment?\n\nThe Chair hears none, and the substitute/amendment is adopted.\n`;
      s += reportMotion("as substituted/with amendment(s)");
      break;
    case "pb_reported":
      s += `The chair lays out as pending business, ${b.num} — ${b.caption}.\n\nMembers, this is the bill/resolution we heard previously that ${B} (explanation).\n`;
      s += reportMotion("without amendment");
      break;
    case "pb_reported_sub":
      s += `The chair lays out as pending business, ${b.num} — ${b.caption}.\n\nMembers, this is the bill/resolution we heard previously that ${B} (explanation).\n\nThe Chair/Representative ${B} (cmte member) offers a committee substitute/amendment.\n\nIs there objection to the adoption of the committee substitute/amendment?\n\nThe Chair hears none, and the substitute/amendment is adopted.\n`;
      s += reportMotion("as substituted/with amendment(s)");
      break;
    case "pb_rolling":
      s += `The chair lays out as pending business, ${b.num} — ${b.caption}.\n\nMembers, this is the bill/resolution we heard previously that ${B} (explanation).\n\nThe Chair/Representative ${B} (cmte member) offers a committee substitute.\n\nThe Chair/Representative ${B} (cmte member) offers an amendment to the committee substitute. Is there objection to the adoption of the amendment? The Chair hears none, and the amendment to the committee substitute is adopted.\n\nIs there objection to the adoption of the committee substitute, as amended? The Chair hears none, and the committee substitute, as amended, is adopted.\n\nThe Chair directs the committee staff to prepare a new complete committee substitute incorporating the adopted amendment(s).\n`;
      s += reportMotion("as substituted");
      break;
    default: break;
  }
  s += `\n[END — ${b.num}]\n`;
  return s;
}

const SIT_BLOCKS = {
  warn1: { label: "1st Warning", group: "Order & Decorum", text: `${LINE}\nFIRST / PREEMPTIVE WARNING\n${LINE}\n\n***GAVEL THREE TIMES***\n\nCHAIR: The Chair advises our guests that the Rules of the House strictly prohibit demonstrations or outbursts from visitors in the audience.\n` },
  warn2: { label: "2nd Warning", group: "Order & Decorum", text: `${LINE}\nSECOND WARNING — AFTER OUTBURST\n${LINE}\n\n***GAVEL THREE TIMES***\n\nCHAIR: If there are additional demonstrations or outbursts from the audience, the Chair will order the Sergeant-at-Arms to clear the audience under the House's constitutional authority to prevent obstruction of its proceedings.\n` },
  warn3: { label: "Clear Audience", group: "Order & Decorum", text: `${LINE}\nFINAL WARNING — CLEAR THE AUDIENCE\n${LINE}\n\n***GAVEL THREE TIMES***\n\nCHAIR: Pursuant to the House's constitutional authority to prevent obstruction of its proceedings, the Chair orders the Sergeant-at-Arms to clear the audience.\n\nThe Committee will stand at ease until the audience is cleared.\n\n***GAVEL ONCE***\n` },
  recess: { label: "Recess Meeting", group: "Procedure", text: `${LINE}\nRECESS\n${LINE}\n\nCHAIR: The chair moves that the committee stand in recess until final adjournment/recess of the House or during bill referral if permission is granted. Is there objection? Hearing none, the motion prevails. The committee stands in recess.\n` },
  adjourn: { label: "Adjourn", group: "Procedure", text: `${LINE}\nCONCLUSION OF MEETING\n${LINE}\n\nCHAIR: Members, that concludes today's agenda. Is there any further business for the committee to address? If not, the Chair moves to adjourn. Is there objection? Hearing none, the committee stands adjourned, subject to the call of the chair.\n` },
  recon_sub: { label: "Recon Sub/Amend", group: "Reconsideration", text: `${LINE}\nRECONSIDERATION OF ADOPTED SUBSTITUTE/AMENDMENT\n${LINE}\n\nThe Chair/Representative ${B} (cmte member) moves to reconsider the vote by which the substitute/amendment was adopted.\n\nIs there objection?\n\nThe Chair hears none, and the motion prevails. The committee substitute/amendment is withdrawn.\n` },
  recon_rpt: { label: "Recon & Re-Report", group: "Reconsideration", text: `${LINE}\nRECONSIDERATION — REPORTED BILL / NEW SUBSTITUTE\n${LINE}\n\nThe Chair/Representative ${B} (cmte member) moves to reconsider the vote by which HB/SB ${B} as substituted/with amendment(s) was reported from committee.\n\nIs there objection?\n\nThe Chair hears none, and the motion prevails.\n\nThe Chair/Representative ${B} (cmte member) moves to reconsider the vote by which the substitute/amendment was adopted.\n\nIs there objection?\n\nThe Chair hears none, and the motion prevails. The committee substitute/amendment is withdrawn.\n\nThe Chair/Representative ${B} (cmte member) offers a committee substitute/amendment.\n\nIs there objection to the adoption of the committee substitute/amendment?\n\nThe Chair hears none, and the substitute/amendment is adopted.\n\nThe Chair/Representative ${B} moves that HB/SB ${B}, as substituted/with amendment(s), be reported favorably to the full House with the recommendation that it do pass and be printed. Clerk will call the roll.\n\n(clerk calls roll)\n\nThere being ${B} ayes, ${B} nays, and ${B} PNVs, the motion prevails/fails.\n` },
  recon_cal: { label: "Recon → Calendar", group: "Reconsideration", text: `${LINE}\nRECONSIDERATION — DIFFERENT CALENDARS COMMITTEE\n${LINE}\n\n[Note: NOT necessary after L&C motion receives nay vote]\n\nThe Chair/Representative ${B} moves to reconsider the vote by which ${B} (measure) was reported from committee.\n\nIs there objection? The Chair hears none, and the motion prevails.\n\nThe Chair/Representative ${B} (cmte member) moves that ${B} (measure), [without amendment/as substituted/with amendment(s)], be reported favorably to the full House with the recommendation that it do pass and be printed [and be sent to the Committee on Local and Consent Calendars]. Clerk will call the roll.\n\n(clerk calls roll)\n\nThere being ${B} ayes, ${B} nays, and ${B} PNVs, the motion prevails.\n` },
  sub_create: { label: "Create Subcommittee", group: "Subcommittee", text: `${LINE}\nCREATION OF SUBCOMMITTEE\n${LINE}\n\nThe chair names the following members to the Subcommittee on ${B}: Representative ${B} Chair, Representatives ${B}, ${B} members.\n` },
  sub_refer: { label: "Refer to Subcommittee", group: "Subcommittee", text: `${LINE}\nREFERRAL TO SUBCOMMITTEE\n${LINE}\n\nThe chair refers the following measure(s) to the Subcommittee on ${B}:\n\n[LIST MEASURES]\n` },
  sub_recall: { label: "Recall from Subcommittee", group: "Subcommittee", text: `${LINE}\nRECALL FROM SUBCOMMITTEE\n${LINE}\n\nThe chair recalls ${B} (measure) from the Subcommittee on ${B} and recognizes Rep. ${B} to explain the measure.\n` },
  sub_motion: { label: "Subcommittee Motion", group: "Subcommittee", text: `${LINE}\nMOTION IN WRITING — SUBCOMMITTEE RECOMMENDATION\n${LINE}\n\nThe following motion in writing by Representative ${B}:\n\nI move that the subcommittee chair inform the committee chair that the subcommittee has completed its deliberations and recommends that ${B} be scheduled for consideration by the full committee.\n\nThe question occurs on the adoption of the motion. Clerk will call the roll.\n\n(clerk calls roll)\n\nThere being ${B} ayes, ${B} nays, and ${B} PNVs, the motion prevails/fails.\n` },
  correct_min: { label: "Correct Minutes", group: "Admin", text: `${LINE}\nCORRECTED MINUTES\n${LINE}\n\nCHAIR: The Chair moves to correct the minutes for the meeting held on ${B} (date). Is there objection? The Chair hears none, and the motion prevails.\n` },
};

const SCENARIO_OPTS = [
  { group: "Public Hearing", options: [
    { value: "ph_pending", label: "Left Pending" },
    { value: "ph_pending_sub", label: "Left Pending (w/ Sub/Amendment)" },
    { value: "ph_reported", label: "Reported w/o Amendment" },
    { value: "ph_reported_sub", label: "Reported as Substituted/Amended" },
  ]},
  { group: "Pending Business", options: [
    { value: "pb_reported", label: "Reported w/o Amendment" },
    { value: "pb_reported_sub", label: "Reported as Substituted/Amended" },
    { value: "pb_rolling", label: "Rolling Sub (Sub + Amend to Sub)" },
  ]},
];

const navy = "#1b2a47";
const gold = "#c8911f";

const css = `
  .tx * { box-sizing: border-box; margin: 0; padding: 0; }
  .tx { font-family: system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; background: #f4f2ee; }
  .tx-hdr { background: ${navy}; padding: 10px 18px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .tx-logo { width: 28px; height: 28px; border-radius: 6px; background: ${gold}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; color: #fff; flex-shrink: 0; }
  .tx-hdr-title { font-size: 14px; font-weight: 600; color: #f8f4ea; }
  .tx-hdr-sub { font-size: 9px; letter-spacing: 1.5px; color: ${gold}; text-transform: uppercase; }
  .tx-hdr-badge { margin-left: auto; font-size: 9px; color: #4a5a7a; text-align: right; line-height: 1.6; }
  .tx-body { display: flex; flex: 1; overflow: hidden; }
  .tx-left { width: 290px; min-width: 290px; background: #fff; border-right: 1px solid #e8e4dc; display: flex; flex-direction: column; overflow: hidden; }
  .tx-top-inputs { padding: 10px 13px 0; flex-shrink: 0; }
  .tx-inp { width: 100%; padding: 7px 11px; border: 1px solid #ddd8cc; border-radius: 7px; background: #fafaf8; color: #1a1a28; font-size: 13px; outline: none; font-family: inherit; }
  .tx-inp:focus { border-color: ${gold}; box-shadow: 0 0 0 2px rgba(200,145,31,0.12); }
  .tx-sel { width: 100%; padding: 7px 11px; border: 1px solid #ddd8cc; border-radius: 7px; background: #fafaf8; color: #1a1a28; font-size: 13px; outline: none; cursor: pointer; font-family: inherit; }
  .tx-tabs { display: flex; border-bottom: 1px solid #e8e4dc; flex-shrink: 0; }
  .tx-tab { flex: 1; padding: 9px 4px; font-size: 12px; font-weight: 500; cursor: pointer; border: none; background: transparent; border-bottom: 2px solid transparent; color: #888; font-family: inherit; transition: all 0.12s; }
  .tx-tab.on { color: ${navy}; border-bottom-color: ${gold}; background: #fdfcf9; }
  .tx-scroll { flex: 1; overflow-y: auto; padding: 13px; }
  .tx-sec { font-size: 9px; letter-spacing: 2px; color: ${gold}; text-transform: uppercase; font-weight: 600; margin-bottom: 9px; display: block; }
  .tx-lbl { font-size: 11px; color: #666; display: block; margin-bottom: 3px; margin-top: 8px; }
  .tx-lbl:first-child { margin-top: 0; }
  .tx-chk { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; cursor: pointer; border-bottom: 1px solid #f0ede6; }
  .tx-chk:last-child { border-bottom: none; }
  .tx-chk-txt { font-size: 13px; color: #1a1a28; line-height: 1.4; }
  .tx-chk-hint { font-size: 10px; color: #aaa; display: block; }
  .tx-btn-gold { width: 100%; padding: 9px; background: ${gold}; border: none; border-radius: 7px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 10px; transition: background 0.15s; }
  .tx-btn-gold:hover { background: #a97318; }
  .tx-btn-gold:disabled { background: #ddd; color: #999; cursor: not-allowed; }
  .tx-btn-navy { width: 100%; padding: 9px; background: ${navy}; border: none; border-radius: 7px; color: #f8f4ea; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 8px; transition: background 0.15s; }
  .tx-btn-navy:hover { background: #243462; }
  .tx-btn-navy:disabled { background: #ddd; color: #999; cursor: not-allowed; }
  .tx-found { margin-top: 9px; padding: 10px 12px; background: #edf7f1; border: 1px solid #7fcca0; border-radius: 8px; }
  .tx-found-lbl { font-size: 9px; letter-spacing: 2px; color: #1a5c34; margin-bottom: 5px; font-weight: 600; }
  .tx-found-row { font-size: 12px; color: #1a3d26; margin-bottom: 2px; line-height: 1.5; }
  .tx-manual { margin-top: 9px; padding: 11px 12px; background: #fef8ec; border: 1px solid #e8c265; border-radius: 8px; }
  .tx-manual-lbl { font-size: 9px; letter-spacing: 2px; color: #7a5200; margin-bottom: 5px; font-weight: 600; }
  .tx-manual-hint { font-size: 11px; color: #8a6200; margin-bottom: 9px; line-height: 1.5; }
  .tx-or { text-align: center; margin-top: 6px; }
  .tx-or-btn { font-size: 11px; color: #888; background: none; border: none; cursor: pointer; text-decoration: underline; font-family: inherit; }
  .tx-qcard { background: #fafaf8; border: 1px solid #e8e4dc; border-radius: 8px; padding: 9px 11px; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 9px; }
  .tx-qnum { width: 20px; height: 20px; border-radius: 4px; background: #dbeafe; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #1e40af; flex-shrink: 0; }
  .tx-qdel { background: none; border: none; color: #bbb; cursor: pointer; font-size: 16px; padding: 0 2px; flex-shrink: 0; line-height: 1; }
  .tx-qdel:hover { color: #e53e3e; }
  .tx-sit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 14px; }
  .tx-sit { padding: 8px 9px; background: #fafaf8; border: 1px solid #e8e4dc; border-radius: 7px; color: #555; font-size: 11px; cursor: pointer; font-family: inherit; text-align: left; line-height: 1.4; transition: all 0.12s; }
  .tx-sit:hover { border-color: ${gold}; color: ${navy}; background: #fdf8ee; }
  .tx-sit-grp { font-size: 10px; color: #aaa; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 5px; }
  .tx-right { flex: 1; display: flex; flex-direction: column; padding: 14px 16px; min-width: 0; overflow: hidden; }
  .tx-rhdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; flex-shrink: 0; flex-wrap: wrap; gap: 7px; }
  .tx-rtitle { font-size: 10px; letter-spacing: 2px; color: ${gold}; text-transform: uppercase; font-weight: 600; }
  .tx-rsub { font-size: 11px; color: #aaa; margin-top: 2px; }
  .tx-rbtns { display: flex; gap: 6px; flex-wrap: wrap; }
  .tx-rbtn { padding: 6px 13px; background: #fff; border: 1px solid #ddd8cc; border-radius: 7px; color: #555; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.12s; }
  .tx-rbtn:hover { border-color: ${gold}; color: ${navy}; }
  .tx-rbtn-word { background: ${navy}; border-color: ${navy}; color: #f8f4ea; }
  .tx-rbtn-word:hover { background: #243462; color: #f8f4ea; border-color: #243462; }
  .tx-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed #ddd8cc; border-radius: 10px; color: #bbb; text-align: center; gap: 10px; padding: 24px; }
  .tx-empty-icon { font-size: 32px; opacity: .25; }
  .tx-empty-txt { font-size: 13px; color: #999; line-height: 1.7; }
  .tx-ta { flex: 1; width: 100%; background: #fff; border: 1px solid #ddd8cc; border-radius: 10px; padding: 18px 22px; color: #1a1a28; font-size: 13px; line-height: 1.9; font-family: Georgia, 'Times New Roman', serif; resize: none; outline: none; min-height: 0; }
  .tx-ta:focus { border-color: #c8c1b0; }
  .tx-hint { margin-top: 5px; font-size: 10px; color: #bbb; text-align: right; flex-shrink: 0; }
  .tx-msg { margin-bottom: 8px; padding: 7px 12px; background: #edf7f1; border-radius: 7px; font-size: 12px; color: #1a5c34; flex-shrink: 0; }
  .spin { display: inline-block; animation: txspin 0.8s linear infinite; }
  @keyframes txspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #ddd8cc; border-radius: 3px; }
`;

export default function App() {
  const [tab, setTab] = useState("meeting");
  const [cmte, setCmte] = useState("");
  const [session, setSession] = useState("89");
  const [mOpts, setMOpts] = useState({ quorum: true, witnessReg: true, timeLimit: false, regClose: false, virtual: false, decorum: true });
  const [billInput, setBillInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | searching | found | manual
  const [found, setFound] = useState(null);
  const [manualNum, setManualNum] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualCaption, setManualCaption] = useState("");
  const [bOpts, setBOpts] = useState({ scenario: "ph_pending", lc: false, testimony: "full" });
  const [queue, setQueue] = useState([]);
  const [script, setScript] = useState("");
  const [copied, setCopied] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const cache = useRef({});
  const taRef = useRef(null);

  const norm = (s) => s.trim().toUpperCase().replace(/\s+/g, " ").replace(/^(HB|SB|HCR|SCR|HR|SR|HJR|SJR)(\d)/, "$1 $2");

  const fetchBill = useCallback(async () => {
    const num = norm(billInput);
    if (!num) return;
    if (cache.current[num]) {
      const b = cache.current[num];
      setFound(b); setManualNum(b.num); setManualAuthor(b.author); setManualCaption(b.caption);
      setStatus("found"); return;
    }
    setFetching(true); setStatus("searching"); setFound(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 512,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system: `You are a Texas legislative bill lookup assistant. Search capitol.texas.gov for the bill. Respond with ONLY a JSON object, nothing else — no markdown, no code fences, no explanation.
Format: {"ok":true,"num":"HB 1234","author":"Rep. Jane Smith","caption":"Relating to..."}
If not found: {"ok":false}`,
          messages: [{ role: "user", content: `Find bill on capitol.texas.gov: ${num} (${session}th Texas Legislature). Return only JSON.` }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const txt = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      const parsed = parseBillJSON(txt);
      if (parsed && parsed.ok) {
        const bill = { num: parsed.num || num, author: parsed.author || "", caption: parsed.caption || "" };
        cache.current[num] = bill;
        setFound(bill); setManualNum(bill.num); setManualAuthor(bill.author); setManualCaption(bill.caption);
        setStatus("found");
      } else {
        setManualNum(num); setStatus("manual");
      }
    } catch {
      setManualNum(num); setStatus("manual");
    } finally { setFetching(false); }
  }, [billInput, session]);

  const confirmManual = () => {
    if (!manualNum || !manualAuthor || !manualCaption) return;
    const bill = { num: manualNum.trim().toUpperCase(), author: manualAuthor.trim(), caption: manualCaption.trim() };
    cache.current[bill.num] = bill;
    setFound(bill); setStatus("found");
  };

  const addToQueue = () => {
    if (!found) return;
    setQueue(prev => [...prev, { ...found, scenario: bOpts.scenario, lc: bOpts.lc, testimony: bOpts.testimony, id: Date.now() + Math.random() }]);
    setBillInput(""); setFound(null); setStatus("idle");
    setManualNum(""); setManualAuthor(""); setManualCaption("");
    setBOpts({ scenario: "ph_pending", lc: false, testimony: "full" });
  };

  const append = (txt) => {
    setScript(prev => prev ? prev + "\n\n" + txt : txt);
    setTimeout(() => { if (taRef.current) taRef.current.scrollTop = taRef.current.scrollHeight; }, 60);
  };

  const generateBills = () => { if (queue.length) append(queue.map((b, i) => buildBillSection(b, i + 1, queue.length)).join("\n")); };

  const copyAll = async () => { await navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const printScript = () => {
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Hearing Script</title><style>body{font-family:Georgia,serif;max-width:740px;margin:48px auto;line-height:1.9;font-size:13px;color:#111;}h2{border-bottom:2px solid #c8911f;padding-bottom:8px;margin-bottom:24px;}pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><h2>Committee on ${cmte || B} — Hearing Script<br/><small style="font-size:13px;font-weight:400;">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</small></h2><pre>${script.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  };

  const downloadWord = async () => {
    if (!script) return;
    setExportMsg("Building Word document...");
    try {
      const docxLib = await import("https://unpkg.com/docx@9.5.0/build/index.umd.js");
      const { Document, Packer, Paragraph, TextRun } = window.docx || docxLib;
      const lines = script.split("\n");
      const children = lines.map(line => {
        if (line.match(/^[═─]/)) return new Paragraph({ children: [new TextRun({ text: line, font: "Courier New", size: 20 })] });
        if (line.match(/^(ITEM \d+|BEGINNING OF|TESTIMONY —|MOTION TO REPORT|STATEMENT REGARDING|FIRST\/|SECOND WARNING|FINAL WARNING|RECESS|CONCLUSION|CORRECTED|RECONSIDERATION|CREATION OF|REFERRAL TO|RECALL FROM|MOTION IN WRITING)/))
          return new Paragraph({ children: [new TextRun({ text: line, bold: true, size: 24 })] });
        if (line.match(/^(CAPTION:|AUTHOR:|CHAIR:|MEMBER:)/)) {
          const idx = line.indexOf(":"); const k = line.slice(0, idx); const v = line.slice(idx + 1).trim();
          return new Paragraph({ children: [new TextRun({ text: k + ":", bold: true, size: 22 }), new TextRun({ text: " " + v, size: 22 })] });
        }
        return new Paragraph({ children: [new TextRun({ text: line || " ", size: 22 })] });
      });
      const doc = new Document({ sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }] });
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Hearing_Script_${(cmte || "Committee").replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setExportMsg("Downloaded!");
    } catch { setExportMsg("Export failed — use Copy and paste into Word."); }
    setTimeout(() => setExportMsg(""), 3000);
  };

  const sitGroups = [...new Set(Object.values(SIT_BLOCKS).map(s => s.group))];
  const hasScript = script.trim().length > 0;

  return (
    <>
      <style>{css}</style>
      <div className="tx">
        <div className="tx-hdr">
          <div className="tx-logo">TX</div>
          <div>
            <div className="tx-hdr-sub">Texas Legislature</div>
            <div className="tx-hdr-title">Hearing Script Builder</div>
          </div>
          <div className="tx-hdr-badge">capitol.texas.gov live lookup<br />89th Legislature · 2025</div>
        </div>

        <div className="tx-body">
          {/* LEFT */}
          <div className="tx-left">
            <div className="tx-top-inputs">
              <input className="tx-inp" value={cmte} onChange={e => setCmte(e.target.value)} placeholder="Committee name..." style={{ marginBottom: 7 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#aaa", whiteSpace: "nowrap" }}>Session:</span>
                <select className="tx-sel" value={session} onChange={e => setSession(e.target.value)} style={{ flex: 1, padding: "5px 8px", fontSize: 12 }}>
                  <option value="89">89th (2025)</option>
                  <option value="88">88th (2023)</option>
                  <option value="87">87th (2021)</option>
                </select>
              </div>
            </div>

            <div className="tx-tabs">
              {[["meeting", "Meeting"], ["bills", "Bills"], ["quick", "Quick Add"]].map(([k, l]) => (
                <button key={k} className={`tx-tab${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>

            <div className="tx-scroll">

              {/* MEETING */}
              {tab === "meeting" && (
                <div>
                  <span className="tx-sec">Opening Block Options</span>
                  {[["quorum", "Quorum statement", "Only if quorum present"], ["witnessReg", "Witness registration reminder", null], ["timeLimit", "Time limit on testimony", "Inserts blank fields"], ["regClose", "Close registration at set time", null], ["virtual", "Virtual witnesses (Zoom)", null], ["decorum", "Decorum statement", "House Rule 4, §13"]].map(([key, lbl, hint]) => (
                    <label key={key} className="tx-chk">
                      <input type="checkbox" checked={mOpts[key]} onChange={e => setMOpts(o => ({ ...o, [key]: e.target.checked }))} style={{ width: 13, height: 13, flexShrink: 0, marginTop: 3, accentColor: gold }} />
                      <span className="tx-chk-txt">{lbl}{hint && <span className="tx-chk-hint">{hint}</span>}</span>
                    </label>
                  ))}
                  <button className="tx-btn-gold" onClick={() => append(meetingOpening(cmte, mOpts))}>+ Add Meeting Opening</button>
                </div>
              )}

              {/* BILLS */}
              {tab === "bills" && (
                <div>
                  <span className="tx-sec">Look Up a Bill</span>
                  <input className="tx-inp" value={billInput}
                    onChange={e => { setBillInput(e.target.value); if (status !== "idle") { setStatus("idle"); setFound(null); } }}
                    onKeyDown={e => e.key === "Enter" && fetchBill()}
                    placeholder="HB 1234, SB 42..." style={{ marginBottom: 7 }} />
                  <button className="tx-btn-navy" onClick={fetchBill} disabled={fetching || !billInput.trim()}>
                    {fetching ? <><span className="spin">↻</span>&nbsp; Searching capitol.texas.gov…</> : "Search Bill"}
                  </button>
                  <div className="tx-or">
                    <button className="tx-or-btn" onClick={() => { setStatus("manual"); setManualNum(norm(billInput) || ""); }}>or enter bill info manually</button>
                  </div>

                  {status === "found" && found && (
                    <div className="tx-found">
                      <div className="tx-found-lbl">✓ BILL FOUND</div>
                      <div className="tx-found-row"><strong>Bill:</strong> {found.num}</div>
                      <div className="tx-found-row"><strong>Author:</strong> {found.author}</div>
                      <div className="tx-found-row" style={{ fontSize: 11 }}><strong>Caption:</strong> {found.caption}</div>
                    </div>
                  )}

                  {status === "manual" && (
                    <div className="tx-manual">
                      <div className="tx-manual-lbl">ENTER BILL INFO MANUALLY</div>
                      <div className="tx-manual-hint">Type in the bill details from capitol.texas.gov — works exactly the same as auto-lookup.</div>
                      <label className="tx-lbl">Bill Number</label>
                      <input className="tx-inp" value={manualNum} onChange={e => setManualNum(e.target.value)} placeholder="HB 1234" style={{ marginBottom: 5, fontSize: 12 }} />
                      <label className="tx-lbl">Author</label>
                      <input className="tx-inp" value={manualAuthor} onChange={e => setManualAuthor(e.target.value)} placeholder="Rep. Jane Smith" style={{ marginBottom: 5, fontSize: 12 }} />
                      <label className="tx-lbl">Caption</label>
                      <input className="tx-inp" value={manualCaption} onChange={e => setManualCaption(e.target.value)} placeholder="Relating to..." style={{ marginBottom: 8, fontSize: 12 }} />
                      <button className="tx-btn-gold" onClick={confirmManual} disabled={!manualNum || !manualAuthor || !manualCaption} style={{ margin: 0, fontSize: 12, padding: "7px 12px" }}>Confirm &amp; Continue</button>
                    </div>
                  )}

                  {status === "found" && found && (
                    <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid #f0ede6" }}>
                      <span className="tx-sec">Script Options</span>
                      <label className="tx-lbl">Hearing Scenario</label>
                      <select className="tx-sel" value={bOpts.scenario} onChange={e => setBOpts(o => ({ ...o, scenario: e.target.value }))}>
                        {SCENARIO_OPTS.map(g => (
                          <optgroup key={g.group} label={`── ${g.group} ──`}>
                            {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label className="tx-lbl">Testimony</label>
                          <select className="tx-sel" value={bOpts.testimony} onChange={e => setBOpts(o => ({ ...o, testimony: e.target.value }))}>
                            <option value="full">Full Public</option>
                            <option value="invited">Invited Only</option>
                            <option value="none">None</option>
                          </select>
                        </div>
                        <div>
                          <label className="tx-lbl">Send to L&amp;C?</label>
                          <select className="tx-sel" value={bOpts.lc} onChange={e => setBOpts(o => ({ ...o, lc: e.target.value === "true" }))}>
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </select>
                        </div>
                      </div>
                      <button className="tx-btn-gold" onClick={addToQueue} style={{ marginTop: 10 }}>+ Add to Hearing Queue</button>
                    </div>
                  )}

                  {queue.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0ede6" }}>
                      <span className="tx-sec">Bill Queue ({queue.length})</span>
                      {queue.map((b, i) => (
                        <div key={b.id} className="tx-qcard">
                          <div className="tx-qnum">{i + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a28" }}>{b.num}</div>
                            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{b.author}</div>
                            <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{SCENARIO_OPTS.flatMap(g => g.options).find(o => o.value === b.scenario)?.label}</div>
                          </div>
                          <button className="tx-qdel" onClick={() => setQueue(prev => prev.filter(x => x.id !== b.id))}>×</button>
                        </div>
                      ))}
                      <button className="tx-btn-navy" onClick={generateBills} style={{ marginTop: 4 }}>
                        Generate Script for {queue.length} Bill{queue.length > 1 ? "s" : ""}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* QUICK ADD */}
              {tab === "quick" && (
                <div>
                  <span className="tx-sec">Click to Append to Script</span>
                  {sitGroups.map(group => (
                    <div key={group}>
                      <div className="tx-sit-grp">{group}</div>
                      <div className="tx-sit-grid">
                        {Object.entries(SIT_BLOCKS).filter(([, v]) => v.group === group).map(([key, v]) => (
                          <button key={key} className="tx-sit" onClick={() => append(v.text)}>{v.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* RIGHT */}
          <div className="tx-right">
            <div className="tx-rhdr">
              <div>
                <div className="tx-rtitle">Hearing Script</div>
                <div className="tx-rsub">{hasScript ? `${script.split("\n").length} lines · fully editable` : "Build your script using the panel on the left"}</div>
              </div>
              {hasScript && (
                <div className="tx-rbtns">
                  <button className="tx-rbtn" onClick={copyAll}>{copied ? "Copied!" : "Copy"}</button>
                  <button className="tx-rbtn" onClick={printScript}>Print</button>
                  <button className="tx-rbtn tx-rbtn-word" onClick={downloadWord}>Download .docx</button>
                  <button className="tx-rbtn" onClick={() => setScript("")}>Clear</button>
                </div>
              )}
            </div>

            {exportMsg && <div className="tx-msg">{exportMsg}</div>}

            {!hasScript ? (
              <div className="tx-empty">
                <div className="tx-empty-icon">📋</div>
                <div className="tx-empty-txt">
                  Go to <strong>Meeting</strong> to add an opening,<br />
                  <strong>Bills</strong> to search and queue bills,<br />
                  or <strong>Quick Add</strong> for situational blocks.
                </div>
              </div>
            ) : (
              <textarea ref={taRef} className="tx-ta" value={script} onChange={e => setScript(e.target.value)} spellCheck />
            )}
            {hasScript && <div className="tx-hint">All blanks shown as ___________ — fill in before the hearing</div>}
          </div>
        </div>
      </div>
    </>
  );
}
