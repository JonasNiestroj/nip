# nip
Package manager for javascript

Nip can install javascript packages and caches them in a global cache so you dont need to download the same package twice.

# Commands
```
install - installs all packages from the package.json
install PACKAGE - installs the given package
```

# Why you should use it instead of NPM
The difference between npm and nip is the global cache. Nip does not place the packages in the node_modules directory. It places the packages in the cache and creates a link to this cache.

Because of this you dont need to download a package twice if you use it for two different projects.