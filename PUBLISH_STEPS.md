```bash
cd /workspaces/astra-libs
chmod +x publish-auto.sh
npm login
./publish-auto.sh patch latest
```

If you want `next` instead of `latest`:

```bash
./publish-auto.sh patch next
```

If you need a prerelease:

```bash
./publish-auto.sh prerelease next
```