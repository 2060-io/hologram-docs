import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import Link from "@docusaurus/Link";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
  to?: string; 
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Learn',
    Svg: require('@site/static/img/learn.svg').default,
    to: '/docs/learn/introduction',
    description: (
      <>
        The Hologram mental model — verifiable AI agents, VUAs, the Verana trust registry, and how the four pillars (Own / Verify / Discover / Govern) fit together.
      </>
    ),
  },
  {
    title: 'Build',
    Svg: require('@site/static/img/use.svg').default,
    to: '/docs/build/quickstart',
    description: (
      <>
        Fork the starter agent, set an OpenAI key, and chat with your own verifiable AI agent in 10 minutes. Then go deep on the Agent Pack, MCP, RBAC, and approvals.
      </>
    ),
  },
  {
    title: 'Run',
    Svg: require('@site/static/img/use.svg').default,
    to: '/docs/run/local',
    description: (
      <>
        Deploy your agent locally with Docker Compose, or to Kubernetes via the Helm chart used by every agent on <code>demos.hologram.zone</code>.
      </>
    ),
  },
];

function Feature({title, to, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <Link to={to}>
        <div className="text--center">
          <Svg className={styles.featureSvg} role="img" />
        </div>
      </Link>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
