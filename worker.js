export default {
  async fetch(request, env, ctx) {
    // Chuyển tiếp mọi request tới bucket assets tĩnh
    return env.ASSETS.fetch(request);
  },
};
