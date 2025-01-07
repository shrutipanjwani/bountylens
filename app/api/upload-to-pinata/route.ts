import { NextResponse } from "next/server";
import { PinataSDK } from "pinata-web3";

const PINATA_GATEWAY =
  process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileData = formData.get("file") as File;

    if (!fileData) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Create a new File object from the uploaded data
    const file = new File([fileData], fileData.name, {
      type: fileData.type,
    });

    const result = await pinata.upload.file(file);

    return NextResponse.json({
      IpfsHash: result.IpfsHash,
      ipfsUrl: `ipfs://${result.IpfsHash}`,
      gatewayUrl: `${PINATA_GATEWAY}/ipfs/${result.IpfsHash}`,
    });
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
