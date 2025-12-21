const mermaidStub = {
  initialize: () => {},
  render: async () => ({
    svg:
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80" role="img" aria-label="Mermaid diagrams disabled">' +
      '<rect width="100%" height="100%" fill="#f8f8f8" stroke="#111" />' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#111" font-family="monospace" font-size="12">' +
      "Mermaid diagrams disabled" +
      "</text>" +
      "</svg>",
  }),
};

export default mermaidStub;
