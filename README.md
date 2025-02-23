# caddy

Hack Ireland project (done in 30hrs straight) - Team 28 (3 people)

> I want to describe an object and get a 3D model ready to be sliced -> printed
 A CADdy for your 3D printing needs!

This app leverages speech understanding (Whisper API), Chat Completions (gpt-4o) and embeddings from a library of ranked 3D models to generate a 3D model from a description.

## Getting Started

Linting, formatting, testing and packaging are all via Github Actions.

### Prerequisites

- Node.js
- npm

### Installation

1. Clone the repo
   ```sh
   git clone git@github.com:danielkennedy1/hack-ireland-team-28.git
   cd hack-ireland-team-28
   ```

2. Get OpenAI API Key
    ```sh 
    export OPENAI_API_KEY=your-api-key
    ```

3. Install NPM packages
    ```sh
    npm install
    ```

4. Start the app
    ```sh 
    npm start
    ```

### Commands

- `npm start` Run electron app and express backend
- `npm run package` Package electron app 
- `npm run make` Make electron app
- `npm run publish` Publish electron app
- `npm run lint` Lint code
- `npm run format` Format code
- `npm run format:check` Check code format
- `npm run test` Run tests
