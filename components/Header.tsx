"use client";

import { ConnectKitButton } from "connectkit";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Header = () => {
  return (
    <div className="flex items-center justify-between">
      {" "}
      <Link href="/" className="flex items-center">
        <Image
          src="/favicon.png"
          width={100}
          height={100}
          alt="logo"
          className="w-10 h-10"
          unoptimized
        />{" "}
        <p className="font-og-bold text-xl">BountyLens</p>
      </Link>
      <ConnectKitButton />
    </div>
  );
};

export default Header;
