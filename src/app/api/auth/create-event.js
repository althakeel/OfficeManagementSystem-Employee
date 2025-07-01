import { getSession } from "next-auth/react";

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const accessToken = session.accessToken;

  const event = {
    summary: "Meeting",
    description: "Google Meet scheduled via app",
    start: { dateTime: new Date().toISOString() },
    end: { dateTime: new Date(Date.now() + 30 * 60000).toISOString() }, // 30 min later
    conferenceData: {
      createRequest: { requestId: "some-random-string" },
    },
  };

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
