/** Example inputs for the analysis workspace. All are fictional. */

export interface ScamExample {
  key: string;
  title: string;
  text: string;
  url: string;
}

export const SCAM_EXAMPLES: ScamExample[] = [
  {
    key: "bank-phish",
    title: "Bank account suspension (phishing)",
    text:
      "Dear Customer,\n\nYour bank account will be suspended within 24 hours due to unusual activity. To avoid legal action you must verify your identity immediately. Click here and enter your login details and the one-time code we send you.\n\nDo not share this message with anyone.\n\nSecurity Team",
    url: "http://secure-login.paypa1-verify.xyz/account/update",
  },
  {
    key: "prize",
    title: "Prize & gift-card payment",
    text:
      "CONGRATULATIONS! You have been selected as this month's lucky winner of a free iPhone. To claim your prize, pay the $4.99 delivery fee using a gift card today only. Reply ASAP — this is your last chance!",
    url: "https://bit.ly/claim-prize-now",
  },
  {
    key: "lookalike",
    title: "Unicode lookalike domain",
    text: "Your Apple ID sign-in was blocked. Confirm your account to restore access.",
    url: "https://аpple-id.com/signin",
  },
  {
    key: "benign",
    title: "Ordinary message (low risk)",
    text:
      "Hi Priya, thanks for the notes from yesterday's project meeting. I've uploaded the revised slides to our shared course folder — let me know if the timeline on slide 4 works for you. See you on Thursday!",
    url: "",
  },
];
