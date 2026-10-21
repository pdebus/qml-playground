[![DOI](https://img.shields.io/badge/DOI-10.1109/MCG.2024.3456288-yellow)](https://doi.ieeecomputersociety.org/10.1109/MCG.2024.3456288)
[![arXiv](https://img.shields.io/badge/arXiv-2507.17931-b31b1b.svg?style=flat)](https://arxiv.org/abs/2507.17931)

<p align="center">
  <img src="QMLPG_Visual.png" alt="QML Playground Illustration" width="200"/>
</p>

# Quantum Machine Learning Playground

The **Quantum Machine Learning (QML) Playground** is an interactive web application designed to visualize and explore the inner workings of quantum machine learning models in an intuitive and educational way. Inspired by classical tools like TensorFlow Playground, it focuses on parameterized quantum circuits (PQCs) — particularly the *data re-uploading universal quantum classifier* — and introduces visual metaphors such as Bloch spheres and the **Q-simplex** to interpret quantum state evolution.

Now extended beyond classification, the playground also supports **regression tasks**, **uncertainty quantification**, and **regularization techniques**, enabling deeper exploration of quantum model performance and generalization.

This playground is ideal for learners, educators, and researchers who want to explore QML models without requiring deep expertise in quantum hardware or simulators.

---

## 🌐 Live Demo

<p align="center">
  <img src="QMLPG_GUI.png" alt="Screenshot of the QML Playground" width="700"/>
</p>

Explore the QML Playground directly in your browser:

👉 **[Try the Live Demo](https://websites.fraunhofer.de/qml-playground/)**

No installation required — perfect for quick experimentation, education, and outreach.

---

## 🧠 How the Quantum Model Works

The playground demonstrates the **data re-uploading variational quantum model**, a flexible architecture introduced by Pérez-Salinas et al. ([Quantum, 2020](https://quantum-journal.org/papers/q-2020-02-06-226/)). This architecture repeatedly embeds classical features into quantum states using trainable gates, mimicking the depth and expressivity of classical neural networks.

Originally designed for classification, it now also supports **quantum regression**, expanding its educational and research potential.

This model was chosen because it is:

* Structurally similar to common **variational quantum circuit (VQC)** architectures
* **Simple enough to visualize** intuitively
* **Powerful enough to be universal**, capable of approximating any function in principle
* Flexible enough to illustrate **training dynamics**, **regularization effects**, and **uncertainty estimates** for regression tasks

---

## ✨ Features

### 🧩 Core Functionality

* 🧠 **Real-time QML model training and visualization**
* 🌐 **Visual Metaphors for Data and Quantum State Evolution**
  * Bloch Sphere for single-qubit state dynamics
  * Q-Simplex for multi-qubit and entanglement visualization
* 🔍 **Layer-by-Layer Quantum Circuit Analysis**
* 📊 **Interactive Performance Metrics and Learning Curves**
* 🎯 **Decision Boundary Visualizations (for classification)**
* 🧪 **Flexible Dataset Generation and Hyperparameter Controls**

### 📈 New in the Latest Version

* 🔢 **Regression Task Support** – Go beyond classification to predict continuous target values using quantum circuits
* ⚖️ **Regularization Options** – Add L1/L2 penalties to study overfitting and model smoothness
* 🌫️ **Uncertainty Quantification (for Regression)** – Visualize predictive uncertainty through sampling-based variance estimation, highlighting how model confidence varies across the input space

### 🐳 Deployment & Accessibility

* 💻 **Browser-Based Interface** – Explore directly in your browser, no installation needed
* 🐳 **Docker Support for Easy Deployment**
* 📦 **Lightweight and Educational by Design**

---

## 🔧 Requirements

* Python 3.11+
* Virtual environment (virtualenv)
* Required Python packages listed in `requirements.txt`
* Docker and Docker Compose (optional)

---

## 🚀 Installation

```bash
# 1. Clone this repository
git clone https://github.com/fraunhofer-aisec/qml-playground
cd qml-playground

# 2. Set up virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## 🖥️ Running the Application

### Browser-only version (`web/`)

A static rewrite in TypeScript runs the quantum simulator, training and all visualizations in your browser. It needs no server and deploys to GitHub Pages. It adds training-speed control, epoch replay, shareable links and dark mode. See [`web/README.md`](web/README.md).

```bash
cd web
npm install
npm run dev   # http://localhost:5173/
```

### Local Development (Dash)

```bash
python app_dev.py
```

Then visit: [http://127.0.0.1:8050/](http://127.0.0.1:8050/)

### Docker Deployment

Pull the latest Docker image from the GitHub Container Registry:

```bash
docker pull ghcr.io/fraunhofer-aisec/qml-playground:latest
```

```bash
docker-compose up -d  # Start container
docker-compose down   # Stop container
```

---

## 🛠 Troubleshooting

* Ensure all required packages are installed
* Verify port 8050 (local) or 80 (Docker) is free
* Make sure Docker Desktop is running (for Docker users)

---

## 📚 Citation

If you use this tool in your research or presentations, please cite:

> P. Debus, S. Issel, and K. Tscharke, "Quantum Machine Learning Playground," *IEEE Computer Graphics and Applications*, vol. 44, no. 05, pp. 40–53, Sept.–Oct. 2024.
> DOI: [10.1109/MCG.2024.3456288](https://doi.ieeecomputersociety.org/10.1109/MCG.2024.3456288)

The arXiv version of this paper is available here: [2507.17931](https://arxiv.org/abs/2507.17931)

---

## 🙋 Maintainer

Developed and maintained by **[Pascal Debus](https://github.com/pdebus)**, [Quantum Security Technologies (QST)](https://www.aisec.fraunhofer.de/en/fields-of-expertise/CST/QST.html), Fraunhofer AISEC.

If you find this work useful, feel free to connect or reach out for collaboration opportunities!
