export type ModuleNode = {
  imports: Array<ModuleNode>;
  lines: number;
  path: string;
  request: string;
};

export type Manifest = {
  modules: Array<ModuleNode>;
};
