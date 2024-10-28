var script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
script.onload = function() {
    console.log("Ethers.js (UMD) loaded!");
    const message = 'SIGNED MESSAGE';
    
    // const hashedMessageWithoutPrefix = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
    const hashedMessageWithoutPrefix = ethers.utils.sha256(ethers.utils.toUtf8Bytes(message));
    
    
    const signature = "SIGNATURE";
    
    const recoveredAddress = ethers.utils.recoverAddress(hashedMessageWithoutPrefix, signature);
    const expectedAddress = "EXPECTED ADDRESS";
    
    console.log(recoveredAddress);
    console.log(expectedAddress);
    
    console.log(recoveredAddress == expectedAddress);
};
document.head.appendChild(script);
