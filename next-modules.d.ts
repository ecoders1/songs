// Stubs for sub-packages inside node_modules that have no @types/* package
// and cause "Cannot find type definition file" noise in the editor.
// skipLibCheck:true suppresses deeper errors; these stubs silence the surface ones.
declare module 'glob' {}
declare module 'minimatch' {}
declare module 'trusted-types' {}
declare module 'resolve' {}
