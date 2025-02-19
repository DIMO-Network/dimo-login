// Step 1: Define the signed message
const signedMessage = 'Hello from DIMO';

// Step 2: Hash the message without Ethereum's prefix
const hashedMessageWithoutPrefix = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes(signedMessage)
);

// Step 4: Extract r, s, and v values from the signature
let signatureR =
  '60bb900a556ead99e87f30bc9fb274d8426951a84d2258786f664a81266e8aec';
let signatureS =
  '4661155ee5182c87e8e584d244c4d51e4d089b9c516f8c34e8edfa42d306c508';
let signatureV = '01'; // v is in hexadecimal

// Step 5: Convert v from hex to decimal and adjust for Ethereum signature recovery
signatureV = parseInt(signatureV, 16); // Convert hex "01" to decimal 1

// Step 6: Ensure r and s are 0x-prefixed and in the correct format
signatureR = '0x' + signatureR;
signatureS = '0x' + signatureS;

// Step 7: Try recovering the address with v = 27
let signatureV27 = signatureV + 27; // v = 27
const combinedSignatureV27 = ethers.utils.joinSignature({
  r: signatureR,
  s: signatureS,
  v: signatureV27,
});

console.log(combinedSignatureV27);
const recoveredAddress = ethers.utils.recoverAddress(
  hashedMessageWithoutPrefix,
  combinedSignatureV27
);
const expectedAddress = '0xB1E674372d4A9cA625a4f8dfA0E41493C3f8b9ca';

console.log(recoveredAddress);
