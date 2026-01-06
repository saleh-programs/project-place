const extensionToMimeType = {
    "jpg": "image/jpg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",

    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "mkv": "video/x-matroska",
    "webm": "video/webm",
    
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "ogg": "audio/ogg",

    "txt": "text/plain",
    "md": "text/markdown",
    "csv": "text/csv",
    "html": "text/html",
    "css": "text/css",
    "js": "text/javascript",
    "ts": "text/typescript",
    "c": "text/x-c", 
    "cpp": "text/x-c++",
    "py": "text/x-python",

    "pdf": "application/pdf",
    "zip": "application/zip",
    "json": "application/json",
    "rar": "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    "tar": "application/x-tar", 
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "odt": "application/vnd.oasis.opendocument.text",
    
}

function FileViewer({url, dimensions, type = null}){
    function getFile(){
        let mimeType = "application/octet-stream"
        let extension;
        if (!type){
            extension = url.split(".").at(-1).toLowerCase()
            if (extension.length === url.length){
                return
            }
            if (Object.hasOwn(extensionToMimeType, extension)){
                mimeType = extensionToMimeType[extension]
            }
        }else{
            mimeType = type;
        }

        const [fileCategory, fileKind] = mimeType.split("/")

        switch (fileCategory){
            case "image":
                const height = Math.min(200,Math.max(50,dimensions[1]))
                return <img style={{height: `${height}px`}} src={url} alt="file" />
            case "video":
                return <video src={url} controls/>
            case "audio":
                return <audio src={url} controls/>
            case "application":
                if (fileKind === "pdf"){
                    return <embed src={url} />
                }
                if (["zip", "x-tar", "x-rar-compressed", "x-7z-compressed"].includes(fileKind)){
                    return <img src="/compressed_file_icon.png" alt="file" />
                }
                return <img src="/uncommon_file_icon.png" alt="file" />
            case "text":
                return <img src="/file_icon.png" alt="file" />
        }
        return  <img src="/uncommon_file_icon.png" alt="file" />
    }

    const fileElem = getFile()
    if (fileElem.type === "video"){
        return fileElem
    }
    return <a href={url} target="_blank">{fileElem}</a>
}
export default FileViewer