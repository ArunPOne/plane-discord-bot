const express = require("express");

function startWebhookServer(client) {
  const app = express();

  // MUST be here or Plane payload fails
  app.use(express.json({ limit: "2mb" }));

  // Optional: browser-friendly check
  app.get("/", (req, res) => {
    res.send("Plane webhook server is running");
  });

  app.post("/plane-webhook", async (req, res) => {
    try {
      console.log("Plane webhook received");
      console.log(JSON.stringify(req.body, null, 2));

      const event = req.body?.event || "unknown.event";

      const channelId = process.env.NOTIFY_CHANNEL_ID;
      if (!channelId) {
        console.error("NOTIFY_CHANNEL_ID not set");
        return res.status(200).send("OK");
      }

      const channel = await client.channels.fetch(channelId);
      const eventType = req.body.event;
      const action = req.body.action;
      const issue = req.body.data || {};
      const actor = req.body.activity?.actor?.display_name || "Someone";

      // Issue details
      const title = issue.name || "Unknown title";
      const sequenceId = issue.sequence_id
        ? `${process.env.PROJECT_KEY || "ISSUE"}-${issue.sequence_id}`
        : "N/A";
      const state = issue.state?.name || "Unknown";
      const priority = issue.priority || "None";

      // Assignees
      const assignees =
        issue.assignees && issue.assignees.length > 0
          ? issue.assignees.map((a) => a.display_name).join(", ")
          : "Unassigned";

      const message = `
**Plane Issue ${action.toUpperCase()}**
• **Title:** ${title}
• **ID:** ${sequenceId}
• **Status:** ${state}
• **Priority:** ${priority}
• **Assigned to:** ${assignees}
• **Action by:** ${actor}
`;

      await channel.send(message);

      return res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook processing failed:", error);
      return res.status(200).send("OK");
    }
  });

  // THIS WAS MISSING
  const PORT = process.env.WEBHOOK_PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Plane webhook listener running on port ${PORT}`);
  });
}

module.exports = { startWebhookServer };
