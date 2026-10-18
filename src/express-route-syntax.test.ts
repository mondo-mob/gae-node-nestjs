import * as express from 'express';
import { AddressInfo } from 'net';

// GCloudModule applies its context/request-scope middleware with forRoutes('{*path}'), which is Express 5 syntax.
// On Express 4 this matches no request, so the peer dependency on express is >= 5. This guards against the
// installed express drifting back to 4.
describe('express route syntax used by GCloudModule', () => {
  it('matches every path on the installed express', async () => {
    const app = express();
    const hits: string[] = [];
    app.use('{*path}', (req, res, next) => {
      hits.push(req.originalUrl);
      next();
    });
    app.use((req, res) => res.send('ok'));
    const server = app.listen(0);
    try {
      const { port } = server.address() as AddressInfo;
      for (const path of ['/', '/a', '/x/y/z']) {
        await fetch(`http://localhost:${port}${path}`).then(response => response.text());
      }
    } finally {
      server.close();
    }

    expect(hits).toEqual(['/', '/a', '/x/y/z']);
  });
});
