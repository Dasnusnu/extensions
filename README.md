# TurboWarp Extension Gallery

User-contributed unsandboxed extension gallery for TurboWarp.

https://extensions.turbowarp.org/

## Kano Wand PR Branch

This checkout is being used to prepare the Kano Wand extension for an official TurboWarp Extension Gallery pull request.

Local files for the Kano Wand extension:

- `extensions/jacob/KanoWand.js`
- `docs/jacob/KanoWand.md`
- `images/jacob/KanoWand.svg`

Useful development commands:

```sh
npm ci
npm run validate
npm run lint
npm run format
```

To test locally, run the TurboWarp extension gallery development server:

```sh
npm start
```

Then load the Kano Wand extension from the local gallery/dev server. Hardware testing should be done in Chrome or Microsoft Edge with a real Kano Harry Potter Coding Wand. The pull request should mention that AI assistance was used and describe the human review and hardware testing that were performed.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Extensions (in the `extensions` folder) will have a comment at the top of the file describing the license for the code. In the past [MIT](./licenses/MIT.txt) was the default, however now [MPL-2.0](./licenses/MPL-2.0.txt) is recommended. Some extensions may contain a mix of several.

Sample projects (in the `samples` folder) are licensed under [CC-BY 4.0](./licenses/CC-BY-4.0.txt).

Everything else, such as the extension images, development server, and website are licensed under the [GNU General Public License version 3](licenses/GPL-3.0.txt).

See [images/README.md](images/README.md) for attribution information for each image.
