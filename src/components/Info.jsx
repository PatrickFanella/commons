import React from "react";
import { ArrowRight, Globe2 } from "lucide-react";
export function AboutPage({ onShare, navigate }) {
  return (
    <div className="about-page">
      <span className="eyebrow">THE IDEA BEHIND OPEN WORLD</span>
      <h1>
        The tools we use
        <br />
        can belong to all of us.
      </h1>
      <p>
        Open World is a meeting place for people rebuilding familiar tools in
        the open. Share what you’re making, learn from others, and find
        collaborators who care about the same problems.
      </p>
      <div className="principles">
        {[
          [
            "01",
            "Find something worth rebuilding",
            "A tool you love. A frustrating subscription. A workflow that could be better.",
          ],
          [
            "02",
            "Build it in the open",
            "Document the work, share the source, and give others a way to contribute.",
          ],
          [
            "03",
            "Find your people",
            "Connect with developers, designers, and users. Small contributions move projects forward.",
          ],
        ].map(([n, t, d]) => (
          <article key={n}>
            <span>{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </div>
      <button className="primary" onClick={onShare}>
        Share your project <ArrowRight size={17} />
      </button>
      <div className="about-reference">
        <Globe2 size={22} />
        <p>
          Inspired by work like{" "}
          <a
            href="https://github.com/storytold/photocraft"
            target="_blank"
            rel="noreferrer"
          >
            PhotoCraft
          </a>
          , a clean-room photo editor rebuilt in Rust. We’re an independent
          community, with no affiliation to that project.
        </p>
      </div>
      <button className="text-link" onClick={() => navigate("/guidelines")}>
        Read the community guidelines <ArrowRight size={15} />
      </button>
    </div>
  );
}
const content = {
  guidelines: {
    eyebrow: "BUILD A GOOD COMMUNITY",
    title: "A few shared principles.",
    sections: [
      [
        "Respect the work and the people.",
        "Be kind, give credit, and make room for different levels of experience. Harassment, hate speech, threats, and sharing someone’s private information don’t belong here.",
      ],
      [
        "Keep the source open.",
        "Share your own work under a clear open-source license. Respect existing licenses. Don’t upload private or proprietary code, stolen assets, credentials, or someone else’s confidential information. Rebuilding a workflow doesn’t make someone else’s code yours.",
      ],
      [
        "Make participation clear.",
        "Explain what you’re building, where the source lives, and what help you need. Be honest about what works, what is planned, and who is involved.",
      ],
      [
        "Keep it useful.",
        "Don’t spam projects, discussions, or profiles. Give thoughtful feedback, document progress, and let others participate without pressure.",
      ],
      [
        "Help moderators care for the community.",
        "Use the report button on a project or discussion message when something needs attention. Reports are visible to administrators, who can remove content or suspend accounts. You can also remove your own discussions and projects.",
      ],
    ],
  },
  privacy: {
    eyebrow: "YOUR INFORMATION, EXPLAINED",
    title: "Privacy on Open World.",
    sections: [
      [
        "What we store.",
        "Your username, display name, profile, password hash, recovery-key hash, account dates, projects, bookmarks, memberships, discussions, and reports are stored on the server. Your plain-text password and recovery key are not stored. Session cookies keep you signed in.",
      ],
      [
        "What is public.",
        "Your username, display name, bio, skills, website, projects, project participation, and discussion messages are public. Project bookmark totals are public; your personal saved-project list is private. Recovery keys and passwords are private. Reports are visible to administrators.",
      ],
      [
        "Cookies and external services.",
        "Open World uses an essential HttpOnly session cookie. There are no advertising cookies, third-party analytics, or embedded trackers. External repository and website links take you to services with their own policies. Fonts and illustrations are served by this site.",
      ],
      [
        "Retention and deletion.",
        "Content stays until its author or an administrator removes it. You can delete your account in Settings; this removes your profile, owned projects, discussions, bookmarks, and memberships. Reports may retain anonymized moderation records. Expired sessions are cleaned up. Operational backups can retain removed data until the operator’s backup retention period ends.",
      ],
      [
        "Keeping your account safe.",
        "Use a unique password and keep your recovery key private. Administrators can see moderation reports and manage content, but cannot read your password or recover your private key. If you lose both your password and recovery key, self-service recovery is unavailable.",
      ],
      [
        "Questions about your data.",
        "Use Settings to review or change your public profile, change your password, or delete your account. Contact the site operator for other account or privacy questions.",
      ],
    ],
  },
  terms: {
    eyebrow: "A SHARED UNDERSTANDING",
    title: "Terms of participation.",
    sections: [
      [
        "Your account.",
        "Choose a username that represents you honestly. Keep your password and recovery key private. You are responsible for activity under your account. Don’t impersonate another person or project.",
      ],
      [
        "Your work stays yours.",
        "You retain ownership of the content you share. By posting it, you allow Open World to store and display it to operate the community. Repository code remains subject to its own license; posting a project here doesn’t change that license.",
      ],
      [
        "Share work you have the right to share.",
        "Only post content you own or have permission to share. Clearly identify your relationship to a project. Curated references are independent pointers to public work and do not imply that its maintainers endorse or participate in Open World.",
      ],
      [
        "Community care.",
        "Follow the Community Guidelines. Administrators can hide projects, remove discussions, and suspend accounts for abuse, spam, rights concerns, or threats to the community. Reports should be made in good faith.",
      ],
      [
        "An independent community.",
        "Project authors are responsible for their work. Links, status descriptions, and discussions are contributed by community members. Evaluate projects before running code, contributing, or relying on a tool. The service may change or become unavailable.",
      ],
      [
        "Leaving and changes.",
        "You can remove your own content and delete your account in Settings. These terms describe the current service; material changes should be announced by the site operator before they take effect.",
      ],
    ],
  },
};
export function InfoPage({ page, navigate, site }) {
  const c = content[page];
  return (
    <article className="info-page">
      <span className="eyebrow">{c.eyebrow}</span>
      <h1>{c.title}</h1>
      <p className="info-date">Updated October 13, 2026</p>
      {site?.operatorName && (
        <div className="operator-contact">
          <p>
            Operated by {site.operatorName}. For account, privacy, or community
            questions, contact{" "}
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
          </p>
        </div>
      )}
      {c.sections.map(([heading, text]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{text}</p>
        </section>
      ))}
      <div className="info-links">
        {["guidelines", "privacy", "terms"]
          .filter((t) => t !== page)
          .map((t) => (
            <button
              className="text-link"
              key={t}
              onClick={() => navigate("/" + t)}
            >
              {t === "guidelines"
                ? "Community guidelines"
                : t === "privacy"
                  ? "Privacy"
                  : "Terms"}{" "}
              <ArrowRight size={14} />
            </button>
          ))}
      </div>
    </article>
  );
}
