
function Documents(){
  // const fileSelectRef = useRef(null)
  // const [files, setFiles] = useState([])
  // function handleFileChange(e){
  //   const reader = new FileReader()
  //   const file = e.target.files[0]
  //   reader.onload = (doneEvent) => {
  //     const data = doneEvent.target.result
  //     setFiles(prev => [...prev, {
  //       "name": file.name,
  //       "extension": file.name.split(".").pop(),
  //       "type": file.type, 
  //       "roomid": roomID,
  //       "contents": data
  //     }])
  //   }

  //   reader.readAsArrayBuffer(file)
  //   e.target.value = ""
  // }
  return (
    <div>
      documents
        {/* <section>
          <input type="file" ref={fileSelectRef} onChange={handleFileChange}/>
        </section>
        {
          files.map((item, i) => {
            return (
              <button key={i} onClick={()=>{
                
                const openURL = URL.createObjectURL(new Blob([item.contents], { type: item.type}))
                window.open(openURL)
                }}>
                <pre>
                  {JSON.stringify(item, null, 2)}
                </pre>
              </button>)
          })
        } */}
    </div>
  )
}

export default Documents