declare module "cors" {
  import type { RequestHandler } from "express";

  export default function cors(): RequestHandler;
}
