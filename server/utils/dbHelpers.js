function table(name, demo) {
  if (demo) return `demo_${name}`;
  return name;
}

module.exports = { table };
