# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2]
### Fixed
- This package will now warn if a required package is not present ([#1003](https://github.com/MetaMask/controllers/pull/1003))

## [1.0.1]
### Changed
- Relax dependencies on `@metamask/approval-controller`, `@metamask/base-controller` and `@metamask/controller-utils` (use `^` instead of `~`) ([#998](https://github.com/MetaMask/controllers/pull/998))

## [1.0.0]
### Added
- Initial release
  - As a result of converting our shared controllers repo into a monorepo ([#831](https://github.com/MetaMask/controllers/pull/831)), we've created this package from select parts of [`@metamask/controllers` v33.0.0](https://github.com/MetaMask/controllers/tree/v33.0.0), namely:
    - Everything in `src/permissions`

    All changes listed after this point were applied to this package following the monorepo conversion.

[Unreleased]: https://github.com/MetaMask/controllers/compare/@metamask/permission-controller@1.0.2...HEAD
[1.0.2]: https://github.com/MetaMask/controllers/compare/@metamask/permission-controller@1.0.1...@metamask/permission-controller@1.0.2
[1.0.1]: https://github.com/MetaMask/controllers/compare/@metamask/permission-controller@1.0.0...@metamask/permission-controller@1.0.1
[1.0.0]: https://github.com/MetaMask/controllers/releases/tag/@metamask/permission-controller@1.0.0