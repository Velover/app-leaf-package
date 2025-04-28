import "reflect-metadata";

declare global {
  namespace Reflect {
    function defineMetadata(
      metadataKey: any,
      metadataValue: any,
      target: Object
    ): void;
    function defineMetadata(
      metadataKey: any,
      metadataValue: any,
      target: Object,
      propertyKey: string | symbol
    ): void;

    function getMetadata(metadataKey: any, target: Object): any;
    function getMetadata(
      metadataKey: any,
      target: Object,
      propertyKey: string | symbol
    ): any;

    function hasMetadata(metadataKey: any, target: Object): boolean;
    function hasMetadata(
      metadataKey: any,
      target: Object,
      propertyKey: string | symbol
    ): boolean;
  }
}
