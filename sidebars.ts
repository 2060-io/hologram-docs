// sidebars.ts
//
// Four top-level sidebars, one per navbar entry:
//   Learn        — concepts
//   Build        — hands-on (quickstart, agent pack, how-tos, advanced)
//   Run          — deploy & operate
//   Reference    — schemas, env vars, glossary

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  learnSidebar: [
    'learn/introduction',
    'learn/agents',
    'learn/trust',
    'learn/hologram-app',
  ],

  buildSidebar: [
    'build/intro',
    'build/quickstart',
    {
      type: 'category',
      label: 'Agent Pack',
      collapsed: false,
      items: [
        'build/agent-pack/overview',
        'build/agent-pack/llm',
        'build/agent-pack/mcp',
      ],
    },
    {
      type: 'category',
      label: 'How-tos',
      collapsed: false,
      items: [
        'build/how-to/add-an-mcp-server',
        'build/how-to/issue-a-credential',
        'build/how-to/verify-a-credential',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      collapsed: true,
      items: [
        'build/advanced/bare-vs-agent',
      ],
    },
  ],

  runSidebar: [
    'run/local',
    {
      type: 'category',
      label: 'Kubernetes',
      collapsed: false,
      items: [
        'run/kubernetes/helm-chart',
      ],
    },
  ],

  referenceSidebar: [
    'reference/agent-pack-schema',
    'reference/env-vars',
  ],
};

module.exports = sidebars;