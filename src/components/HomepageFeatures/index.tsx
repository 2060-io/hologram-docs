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
    to: '/docs/next/learn/intro',
    description: (
      <>
        Learn how Verifiable Trust empowers user-centric privacy, verifiable credentials, decentralized governance, and ethical monetization, enabling verifiable services and ecosystems built on transparency, not surveillance.
      </>
    ),
    
  },
  {
    title: 'Use',
    Svg: require('@site/static/img/use.svg').default,
    to: '/docs/next/use/intro',
    description: (
      <>
        Create your Trust Registry, define credential schemas, authorize trust registry operators, issuers, verifiers, and implement privacy-preserving verifiable credential monetization in your ecosystem.
      </>
    ),
  },
  {
    title: 'Run a Verana Network Node',
    Svg: require('@site/static/img/run-a-node.svg').default,
    to: '/docs/next/network/intro',
    description: (
      <>
        Learn how to run a Verana Verifiable Trust Network (VVTN) node. This section guides validators and community members who want to operate nodes and help secure and grow the network.
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
