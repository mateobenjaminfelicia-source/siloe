import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { presentationsAPI } from "../services/api";
import Button from "../components/UI/Button";
import Navbar from "../components/UI/Navbar";
import GeneratingOverlay from "../components/UI/GeneratingOverlay";

const Generator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("PROMPT"); // PROMPT, STRUCTURE, RESULT
  const [prompt, setPrompt] = useState("");
  const [numSlides, setNumSlides] = useState(6);
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Paso 1: Generar la estructura
  const handleGenerateStructure = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await presentationsAPI.generateStructure({
        prompt,
        num_slides: numSlides,
      });
      setStructure(res.data);
      setStep("STRUCTURE");
    } catch (e) {
      setError("Error generando la estructura. Intenta de nuevo.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Finalizar la presentación basándose en la estructura editada
  const handleFinalize = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await presentationsAPI.finalizePresentation(structure);
      setStep("RESULT");
      // Guardamos la info de la presentación final en la estructura para mostrarla
      setStructure(res.data);
    } catch (e) {
      setError("Error al generar el contenido final.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Editar título de un slide en la estructura
  const updateSlideTitle = (index, newTitle) => {
    const newStructure = { ...structure };
    newStructure.slides[index].title = newTitle;
    setStructure(newStructure);
  };

  return (
    <div className="generator-container">
      <Navbar />
      <div className="generator-content">
        {step === "PROMPT" && (
          <div className="prompt-card">
            <h1>Crea tu Presentación</h1>
            <p>Describe el tema y la IA diseñará la estructura por ti.</p>
            <textarea
              placeholder="Ej: La historia de la inteligencia artificial desde Turing hasta hoy..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="options">
              <label>Cantidad de slides: </label>
              <input
                type="number"
                value={numSlides}
                onChange={(e) => setNumSlides(parseInt(e.target.value))}
              />
            </div>
            <Button
              onClick={handleGenerateStructure}
              disabled={loading || !prompt}
            >
              {loading ? "Analizando..." : "Generar Estructura"}
            </Button>
            {error && <p className="error">{error}</p>}
          </div>
        )}

        {step === "STRUCTURE" && (
          <div className="structure-card">
            <h1>Refina la Estructura</h1>
            <p>Puedes cambiar los títulos de los slides antes de generar el contenido final.</p>
            <div className="slides-list">
              {structure.slides.map((slide, index) => (
                <div key={index} className="slide-item">
                  <span className="slide-number">{slide.slide_order}</span>
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => updateSlideTitle(index, e.target.value)}
                  />
                  <span className="slide-type">{slide.slide_type}</span>
                </div>
              ))}
            </div>
            <div className="actions">
              <Button onClick={() => setStep("PROMPT")} variant="secondary">Volver</Button>
              <Button onClick={handleFinalize} disabled={loading}>
                {loading ? "Generando..." : "Generar Contenido Final"}
              </Button>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        )}

        {step === "RESULT" && (
          <div className="result-card">
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>¡Presentación Lista!</h1>
            <p>Tu presentación ha sido generada y guardada en tu dashboard.</p>

            <div className="preview-container">
              <div className="preview-header">
                <h2>{structure.title}</h2>
                <p>{structure.subtitle}</p>
              </div>

              <div className="slides-preview">
                {structure.slides?.map((slide, index) => (
                  <div key={index} className="mini-slide">
                    <span className="slide-num">{slide.slide_order}</span>
                    <div className="slide-info">
                      <strong>{slide.title}</strong>
                      <span className="slide-type-tag">{slide.slide_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={() => navigate("/dashboard")}>Ir al Dashboard</Button>
          </div>
        )}
      </div>

      {/* Pantalla de carga mientras la IA trabaja */}
      {loading && <GeneratingOverlay mode={step === "PROMPT" ? "structure" : "content"} />}

      <style jsx>{`
        .generator-container {
          min-height: 100vh;
          background: var(--bg-color);
          color: white;
          padding-top: 80px;
        }
        .generator-content {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
        }
        .prompt-card, .structure-card, .result-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 3rem;
          max-width: 800px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        textarea {
          width: 100%;
          height: 150px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          color: white;
          padding: 1rem;
          font-size: 1.1rem;
          margin: 1.5rem 0;
          resize: none;
        }
        .options {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }
        .options input {
          width: 60px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          padding: 5px;
          border-radius: 4px;
          text-align: center;
        }
        .slides-list {
          margin: 2rem 0;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .slide-item {
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(255,255,255,0.03);
          padding: 10px;
          border-radius: 8px;
        }
        .slide-number {
          font-weight: bold;
          color: #aaa;
          min-width: 20px;
        }
        .slide-item input {
          flex: 1;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          color: white;
          font-size: 1rem;
          padding: 5px;
        }
        .slide-type {
          font-size: 0.8rem;
          color: #888;
          text-transform: uppercase;
          min-width: 70px;
          text-align: right;
        }
        .actions {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 2rem;
        }
        .error {
          color: #ff4d4d;
          margin-top: 1rem;
        }
        .preview {
          margin: 2rem 0;
          padding: 2rem;
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default Generator;
