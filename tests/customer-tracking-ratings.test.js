"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const customer = fs.readFileSync(path.join(root, "public/assets/js/pages/customer-booking.js"), "utf8");
const customerHtml = fs.readFileSync(path.join(root, "public/pages/customer-booking.html"), "utf8");
const bookings = fs.readFileSync(path.join(root, "public/assets/js/pages/bookings.js"), "utf8");
const backend = fs.readFileSync(path.join(root, "scripts/app-script-final-owner-access.js"), "utf8");

test("tracking requires the reference and four phone digits without returning customer identity", () => {
  assert.match(customer, /action:\s*"getPublicBookingStatus"[\s\S]{0,180}trackingToken:\s*state\.trackingToken[\s\S]{0,100}phoneLast4:\s*state\.phoneLast4/);
  assert.match(customer, /TRACKING_VERIFICATION_FAILED[\s\S]{0,160}sessionStorage\.removeItem/);
  const publicView = backend.match(/function publicBookingView\(booking\)\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(publicView, /customerName|customerPhone|trackingToken/);
  assert.match(backend, /supplied\.length === 4[\s\S]{0,80}supplied === expected/);
});

test("proposal controls use the exact accept and reject backend contract", () => {
  assert.match(customer, /data-proposal="accept"/);
  assert.match(customer, /data-proposal="reject"/);
  assert.doesNotMatch(customer, /data-proposal="decline"/);
  assert.match(backend, /\["accept",\s*"reject"\]\.indexOf\(response\)/);
});

test("proposal responses are verified, idempotent, and Phase 5 validated before commit", () => {
  assert.match(customer, /pendingProposalRequests\[key\]\s*\|\|=/);
  assert.match(customer, /clientRequestId:\s*state\.pendingProposalRequests\[key\]/);
  const proposal = backend.match(/function respondToBookingProposal\(data\)\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(proposal, /verifyBookingTrackingPhone/);
  assert.match(proposal, /validateBookingAppointmentV2/);
  assert.match(proposal, /commitBookingPhase5UnderCurrentLock/);
  assert.match(proposal, /BOOKING_PROPOSAL_ACCEPTED/);
  assert.match(proposal, /BOOKING_PROPOSAL_REJECTED/);
});

test("staff proposal availability uses the booking branch and ignores stale date responses", () => {
  assert.match(bookings, /action:\s*"getPublicBookingOptions",\s*branchId:\s*booking\.branchId/);
  assert.match(bookings, /const proposedDate = body\.querySelector\("#proposalDate"\)\.value/);
  assert.match(bookings, /const sequence = \+\+requestSequence/);
  assert.match(bookings, /sequence !== requestSequence \|\| body\.querySelector\("#proposalDate"\)\.value !== proposedDate/);
  assert.match(bookings, /response\?\.status !== "success"/);
  assert.match(bookings, /await updateStatus\(booking, "proposed"[\s\S]{0,180}setTimeout\(\(\) => fetchBookings\(\{ silent: true \}\), 0\)/);
});

test("booking filters queue the canonical date and status after in-flight reads", () => {
  assert.match(bookings, /bookingRequestSequence:\s*0,\s*bookingReloadQueued:\s*false/);
  assert.match(bookings, /const requestedDate = elements\.filterDate\.value/);
  assert.match(bookings, /const requestedStatus = elements\.status\.value/);
  assert.match(bookings, /filters:\s*\{ date: requestedDate, status: requestedStatus \}/);
  assert.match(bookings, /requestSequence !== state\.bookingRequestSequence[\s\S]{0,180}elements\.filterDate\.value !== requestedDate/);
  assert.match(bookings, /state\.bookingReloadQueued \|\| requestSequence !== state\.bookingRequestSequence[\s\S]{0,180}fetchBookings\(\{ silent: true \}\)/);
});

test("ratings render only for completed bookings and backend eligibility remains authoritative", () => {
  assert.match(customer, /result\.booking\.status === "done"\) await renderRating/);
  assert.match(backend, /found\.booking\.status !== "done"[\s\S]{0,180}BOOKING_NOT_COMPLETED/);
  assert.match(backend, /!Number\.isInteger\(ratingValue\)[\s\S]{0,140}INVALID_RATING/);
  assert.match(backend, /ratingValue < 1 \|\| ratingValue > 5/);
});

test("rating submission is one-per-booking, privacy-preserving, and recovers from request errors", () => {
  assert.match(backend, /ratings\.some\(\(item\) => item\.bookingId === found\.booking\.id\)/);
  assert.match(backend, /RATING_ALREADY_SUBMITTED/);
  assert.match(backend, /customerPhoneHash:\s*hashBookingPhone/);
  assert.match(customer, /action:\s*"submitBookingRating"/);
  assert.match(customer, /catch \(error\)[\s\S]{0,180}button\.disabled = false[\s\S]{0,100}classList\.remove\("loading"\)/);
});

test("tracking and ratings expose mobile-friendly RTL and accessible controls", () => {
  assert.match(customerHtml, /<html lang="ar" dir="rtl">/);
  assert.match(customerHtml, /name="viewport" content="width=device-width, initial-scale=1\.0"/);
  assert.match(customerHtml, /id="trackingContent"[^>]*aria-live="polite"/);
  assert.match(customer, /role="radiogroup"/);
  assert.match(customer, /role="radio" aria-checked="false"/);
  assert.match(customerHtml, /role="dialog" aria-modal="true"/);
});
