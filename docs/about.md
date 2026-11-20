# About these docs

I wrote these docs as a working example of how I approach documentation. Most of my professional work is under NDA, so this is the public version: real software, documented the way I'd document a product.

## How the docs are organized

The content follows the [Diátaxis](https://diataxis.fr) framework, which splits documentation by what the reader needs at that moment:

| Type | Reader's need | Pages |
| --- | --- | --- |
| **Tutorial** | "Help me get started." | [Quickstart](quickstart.md) |
| **How-to guides** | "Help me do a specific task." | [Tune the difficulty](how-to/tune-difficulty.md), [Add a room](how-to/add-a-room.md) |
| **Concepts** | "Help me understand how it works." | [Rooms and the camera](concepts/rooms-and-camera.md), [The boss fight](concepts/boss-fight.md) |
| **Reference** | "Give me the facts." | [Controls](reference/controls.md), [Gameplay settings](reference/gameplay-settings.md) |

Keeping these types separate means a how-to guide doesn't turn into an essay, and a reference table doesn't hide its facts inside paragraphs.

## How the docs are built

The docs are written and published like code:

- **Markdown in the same repo as the game.** A pull request that changes the game can update its docs at the same time.
- **[MkDocs](https://www.mkdocs.org) with the Material theme** builds the site.
- **[Vale](https://vale.sh)** checks every change against a style guide, based on the Google developer documentation style, plus a project word list.
- **GitHub Actions** lints each pull request and publishes the site automatically when changes merge to `main`.

## Accuracy

Every default value and behavior on these pages was checked against the source code. If the code changes, the reference pages are the first place to update.

---

*Elliott White · [Portfolio](https://elliottwhite252.github.io/portfolio/) · [GitHub](https://github.com/elliottwhite252)*
