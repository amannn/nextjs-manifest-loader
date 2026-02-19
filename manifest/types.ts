export type ModuleNode = {
  path: string;
  request: string;
  imports: Array<ModuleNode>;
};

export type Manifest = {
  modules: Array<ModuleNode>;
};
