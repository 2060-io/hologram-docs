import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

/* -------------------------------------------------------------------------- *
 *  Homepage — design language locked to hologram.zone.
 *
 *  Sections (top → bottom):
 *    1. Hero          — pill + gradient headline + dual CTA, on a
 *                       bg-grid + hero-glow backdrop.
 *    2. Three pillars — Learn / Build / Run, as cards.
 *    3. Quickstart    — fork-and-go callout with a code-window mock
 *                       of agent-pack.yaml.
 *    4. Reference     — five compact reference-doc cards.
 *    5. Ecosystem     — three cards linking out to the live agent
 *                       network (vs.hologram.zone, demo agents, repos).
 *
 *  All visual primitives (.card-surface, .pill, .gradient-text,
 *  .hero-glow, .bg-grid, .h-display, .eyebrow) live as global classes
 *  in src/css/custom.css so docs pages can re-use them.
 * -------------------------------------------------------------------------- */

type IconProps = {className?: string};

function IconBook({className}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconHammer({className}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d="M14.7 6.3a3 3 0 0 1 4.2 0l-1.4 1.4a3 3 0 0 0-4.2 0z" />
      <path d="M10.5 7.5l6 6" />
      <path d="M7 11l3-3 7 7-3 3z" />
      <path d="M3 21l4-4" />
    </svg>
  );
}

function IconShip({className}: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d="M3 17l1.5-7h15L21 17" />
      <path d="M3 17a4 4 0 0 0 4 0 4 4 0 0 0 5 0 4 4 0 0 0 5 0 4 4 0 0 0 4 0" />
      <path d="M12 4v6" />
      <path d="M9 7h6" />
    </svg>
  );
}

const PILLARS = [
  {
    title: 'Learn',
    Icon: IconBook,
    to: '/docs/learn/introduction',
    description:
      'The Hologram mental model — verifiable AI agents, the trust model, where each piece sits in the wider ecosystem.',
    cta: 'Read the concepts',
  },
  {
    title: 'Build',
    Icon: IconHammer,
    to: '/docs/build/quickstart',
    description:
      'Fork the starter, set an OpenAI key, chat with your own verifiable agent in 10 minutes. Then go deep on the Agent Pack — MCP, RBAC, approvals.',
    cta: 'Start the quickstart',
  },
  {
    title: 'Run',
    Icon: IconShip,
    to: '/docs/run/local',
    description:
      'Run locally with Docker Compose, or deploy to Kubernetes via the Helm chart used by every agent on vs.hologram.zone.',
    cta: 'Deploy your agent',
  },
];

const REFERENCE = [
  {
    label: 'Reference',
    title: 'Agent Pack schema',
    text: 'Field-by-field schema reference for agent-pack.yaml.',
    to: '/docs/reference/agent-pack-schema',
  },
  {
    label: 'Reference',
    title: 'Environment vars',
    text: 'Canonical index of every env var the chatbot reads.',
    to: '/docs/reference/env-vars',
  },
  {
    label: 'Reference',
    title: 'Admin API',
    text: 'VS Agent admin REST surface — connections, messaging, VDR.',
    to: '/docs/reference/admin-api',
  },
  {
    label: 'Reference',
    title: 'Webhook events',
    text: 'Connection / message / received topics, with full schemas.',
    to: '/docs/reference/webhook-events',
  },
  {
    label: 'Reference',
    title: 'Glossary',
    text: 'Controlled vocabulary for the Hologram + Verana stack.',
    to: '/docs/reference/glossary',
  },
];

const ECOSYSTEM = [
  {
    title: 'Live agents',
    text: 'Production agents trust-resolved through Verana. Connect from the Hologram app to see verifiable agents in action.',
    to: 'https://vs.hologram.zone',
    cta: 'vs.hologram.zone →',
    external: true,
  },
  {
    title: 'Cookbook walkthroughs',
    text: 'Annotated end-to-end builds — example agent, GitHub agent, Wise agent, customer-service agent.',
    to: '/docs/build/cookbook/hologram-example-agent',
    cta: 'Open the cookbook',
    external: false,
  },
  {
    title: 'Source repos',
    text: 'Every agent on vs.hologram.zone is open source. Fork, deploy, contribute.',
    to: 'https://github.com/2060-io',
    cta: 'github.com/2060-io →',
    external: true,
  },
];

function PillarCard({pillar}: {pillar: (typeof PILLARS)[number]}) {
  const {Icon} = pillar;
  return (
    <Link to={pillar.to} className={`card-surface ${styles.pillarCard}`}>
      <span className={styles.pillarIcon}>
        <Icon />
      </span>
      <h3 className={styles.pillarTitle}>{pillar.title}</h3>
      <p className={styles.pillarText}>{pillar.description}</p>
      <span className={styles.pillarLink}>{pillar.cta}</span>
    </Link>
  );
}

function CodeWindow() {
  return (
    <div className={styles.codeWindow} aria-label="agent-pack.yaml example">
      <div className={styles.codeWindowHeader}>
        <div className={styles.codeWindowDots}>
          <span />
          <span />
          <span />
        </div>
        <span>agent-pack.yaml</span>
      </div>
      <pre className={styles.codeWindowBody}>
        <code>
          <span className={styles.codeKey}>metadata</span>
          {':\n  '}
          <span className={styles.codeKey}>id</span>
          {': '}
          <span className={styles.codeStr}>example-agent</span>
          {'\n  '}
          <span className={styles.codeKey}>displayName</span>
          {': '}
          <span className={styles.codeStr}>Example Agent</span>
          {'\n\n'}
          <span className={styles.codeKey}>llm</span>
          {':\n  '}
          <span className={styles.codeKey}>provider</span>
          {': '}
          <span className={styles.codeStr}>openai</span>
          {'\n  '}
          <span className={styles.codeKey}>model</span>
          {': '}
          <span className={styles.codeStr}>gpt-5.4-mini</span>
          {'\n\n'}
          <span className={styles.codeKey}>mcp</span>
          {':\n  '}
          <span className={styles.codeKey}>servers</span>
          {':\n    - '}
          <span className={styles.codeKey}>name</span>
          {': '}
          <span className={styles.codeStr}>context7</span>
          {'\n      '}
          <span className={styles.codeKey}>url</span>
          {': '}
          <span className={styles.codeStr}>https://mcp.context7.com/mcp</span>
          {'\n      '}
          <span className={styles.codeKey}>accessMode</span>
          {': '}
          <span className={styles.codeKw}>admin-controlled</span>
          {'\n\n'}
          <span className={styles.codeKey}>flows</span>
          {':\n  '}
          <span className={styles.codeKey}>authentication</span>
          {':\n    '}
          <span className={styles.codeKey}>enabled</span>
          {': '}
          <span className={styles.codeKw}>true</span>
          {'\n    '}
          <span className={styles.codeKey}>credentialDefinitionId</span>
          {': '}
          <span className={styles.codeStr}>{'${CREDENTIAL_DEFINITION_ID}'}</span>
        </code>
      </pre>
    </div>
  );
}

function Hero() {
  return (
    <section className={`${styles.hero} hero-glow`}>
      <div className={`${styles.heroGrid} bg-grid`} aria-hidden="true" />
      <div className={styles.heroInner}>
        <h1 className={`h-display ${styles.heroTitle}`}>
          Hologram Developer <br />
          <span className="gradient-text">Documentation</span>
        </h1>
        <p className={styles.heroLead}>
          Build, deploy, and run verifiable AI agents on the Hologram
          network. Concepts, tutorials, and reference for engineers.
        </p>
        <div className={styles.heroCtas}>
          <Link
            className="button button--primary"
            to="/docs/build/quickstart">
            Get started
          </Link>
          <Link
            className="button button--secondary"
            to="/docs/learn/introduction">
            Read the introduction
          </Link>
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionContainer}>
        <header className={styles.sectionHead}>
          <span className="eyebrow">Three paths</span>
          <h2 className={styles.sectionTitle}>Learn the model. Build an agent. Run it anywhere.</h2>
          <p className={styles.sectionLead}>
            Pick where you are on the journey. Each path links into a focused
            sidebar with everything in order.
          </p>
        </header>
        <div className={styles.pillarGrid}>
          {PILLARS.map((pillar) => (
            <PillarCard key={pillar.title} pillar={pillar} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Quickstart() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionContainer}>
        <div className={`card-surface ${styles.quickstart}`}>
          <div>
            <span className="eyebrow">Recommended start</span>
            <h2 className={styles.quickstartTitle}>Fork, configure, ship.</h2>
            <p className={styles.quickstartText}>
              Every Hologram agent is one YAML manifest — its{' '}
              <strong>Agent Pack</strong> — that captures personality, language,
              LLM, tools, authentication, and access control. Fork{' '}
              <code>hologram-ai-agent-example</code>, point at your LLM, and
              you have a running, trust-resolvable agent in ten minutes.
            </p>
            <Link
              to="/docs/build/quickstart"
              className={`button button--primary ${styles.quickstartCta}`}>
              Open the quickstart
            </Link>
          </div>
          <CodeWindow />
        </div>
      </div>
    </section>
  );
}

function Reference() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionContainer}>
        <header className={styles.sectionHead}>
          <span className="eyebrow">Reference</span>
          <h2 className={styles.sectionTitle}>Look it up, fast.</h2>
          <p className={styles.sectionLead}>
            Schemas, env vars, admin endpoints, webhook events, and the
            controlled vocabulary that ties them together.
          </p>
        </header>
        <div className={styles.refGrid}>
          {REFERENCE.map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className={`card-surface ${styles.refCard}`}>
              <span className={styles.refCardLabel}>{item.label}</span>
              <h3 className={styles.refCardTitle}>{item.title}</h3>
              <p className={styles.refCardText}>{item.text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ecosystem() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionContainer}>
        <header className={styles.sectionHead}>
          <span className="eyebrow">Ecosystem</span>
          <h2 className={styles.sectionTitle}>The network is live.</h2>
          <p className={styles.sectionLead}>
            Hologram isn't a paper spec. There are running agents you can talk
            to, source repos you can fork, and a public trust registry anchoring
            it all.
          </p>
        </header>
        <div className={styles.ecoRow}>
          {ECOSYSTEM.map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className={`card-surface ${styles.ecoCard}`}
              {...(item.external
                ? {target: '_blank', rel: 'noopener noreferrer'}
                : {})}>
              <h3 className={styles.ecoTitle}>{item.title}</h3>
              <p className={styles.ecoText}>{item.text}</p>
              <span className={styles.ecoLink}>{item.cta}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}>
      <main className={styles.page}>
        <Hero />
        <Pillars />
        <Quickstart />
        <Reference />
        <Ecosystem />
      </main>
    </Layout>
  );
}
