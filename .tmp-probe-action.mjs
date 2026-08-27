import { ACTIONS, adminPost, db, log } from "./.tmp-events-harness.mjs";

// minimal action: updateEventSubmissionStatus(event_id, submission_status)
const events = await db("events?select=id,title&limit=1");
const ev = events[0];
log("target event:", ev?.id?.slice(0, 8), ev?.title);
const res = await adminPost(ACTIONS.updateEventSubmissionStatus, {
  event_id: ev.id,
  submission_status: "published",
});
log("moderation ->", res.status, res.location ?? "no redirect");
console.log(res.text.slice(0, 300));