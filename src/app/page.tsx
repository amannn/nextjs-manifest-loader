import Test from './Test';

const manifest = /* inject */ {};

export default function Home() {
  return (
    <main>
      <div>Hello world!</div>
      <pre>{JSON.stringify(manifest, null, 2)}</pre>
      <Test />
    </main>
  );
}
