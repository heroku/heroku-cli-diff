# heroku-cli-diff

Lists differences between Heroku apps:

- config vars
- stack
- buildpacks
- add-ons
- feature flags

## Installation

```
$ heroku plugins:install heroku-cli-diff
Installing plugin heroku-cli-diff... done
```

## Use

```
$ heroku apps:diff APP1 APP2
```

```
$ heroku apps:diff go-getting-started-staging go-on-heroku

property                    go-getting-started-staging                                   go-on-heroku
──────────────────────────  ───────────────────────────────────────────────────────────  ───────────────────────────────────────────────────────────
slug (checksum)             SHA256:f166815b4b65b78d1bc99b7d70d45526a7f035cc6f1e875cb...  SHA256:06695f3f7d27403463a146c201e070158c091f940ce5f2770...
config (DATABASE_URL)       ...
add-on (heroku-postgresql)  true                                                         false
```

```
$ heroku apps:diff semver semver-staging

property                        semver                                    semver-staging
──────────────────────────────  ────────────────────────────────────────  ────────────────────────────────────────
config (MIN_STABLE_NODE)        0.8.5
config (RESOLVER_TIMEOUT)                                                 1
feature (log-runtime-metrics)   enabled                                   disabled
```