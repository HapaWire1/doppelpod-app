import assert from "node:assert/strict";
import test from "node:test";

test("plan labels mark unshipped features as coming soon", async () => {
  const { PRO_FEATURES, ELITE_FEATURES, TRIAL_FEATURES, featureLabel, PRO_PRICE_MONTHLY, ELITE_PRICE_YEARLY } = await import("./plans.ts");
  const pro = PRO_FEATURES.map(featureLabel).join(" | ");
  assert.match(pro, /Cowork \(coming soon\)/);
  assert.match(pro, /Virality score \(coming soon\)/);
  assert.match(pro, /Multi-platform posting \(coming soon\)/);
  assert.match(pro, /Unlimited voice generation/);
  assert.equal(PRO_FEATURES.filter((f) => f.label === "Virality score" && !f.comingSoon).length, 0);
  assert.match(ELITE_FEATURES.map(featureLabel).join(" | "), /Cowork voice chat \(coming soon\)/);
  assert.match(TRIAL_FEATURES.map(featureLabel).join(" | "), /Multi-platform posting \(coming soon\)/);
  assert.equal(PRO_PRICE_MONTHLY, "$29");
  assert.equal(ELITE_PRICE_YEARLY, "$690");
});

test("fallback twin post is a real post, not an echo of the topic", async () => {
  const { writeFallbackTwinPost } = await import("./twin-post.ts");
  const topic = "AI productivity";
  const post = writeFallbackTwinPost(topic, "neutral");
  assert.notEqual(post.trim(), topic);
  assert.ok(!post.startsWith(`"${topic}"`));
  assert.ok(!post.includes("10x more magnetic"));
  assert.ok(post.length > topic.length + 40);
  assert.ok(post.toLowerCase().includes("post"));
});
