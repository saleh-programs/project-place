function FileViewer({file}){
    const [fileCategory, fileKind] = file.type.split("/")
    const preview = URL.createObjectURL(file)

    switch (fileCategory){
        case "image":
            return <img src={preview} alt="file" />
        case "video":
            return <video src={preview} controls/>
        case "audio":
            return <audio src={preview} controls/>
        case "application":
            if (fileKind === "pdf"){
                return <embed src={preview} />
            }
            if (["zip", "x-tar","x-zip-compressed", "x-rar-compressed", "x-7z-compressed"].includes(fileKind)){
                return <img src="/compressed_file_icon" alt="file" />
            }
            
            return <img src="/uncommon_file_icon.png" alt="file" />
        case "text":
            return <img src="/file_icon.png" alt="file" />
    }
    return  <img src="/uncommon_file_icon.png" alt="file" />
}
export default FileViewer