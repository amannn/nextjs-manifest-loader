# nextjs-manifest-loader

Turbopack loader experiment that injects a hierarchical module graph manifest into files containing `/* inject */ {}`.

It effectively "looks ahead" of what a particular component is going to render and provides this information ahead of time.
